import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { BrandIntelligence, AuditPrompt } from "../analyze/route";
import { createAudit } from "@/lib/audit-store";

// The audit loop runs up to 8 sequential Claude web-search calls plus
// recommendation generation and a Blob write. Total wall time is ~3-4 minutes.
// Without this, Vercel Hobby caps the function at 10 seconds.
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJSON(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/```\s*$/m, "")
    .trim();
  return JSON.parse(cleaned);
}

async function queryWithWebSearch(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nList the top brands or products you would recommend. Be specific with brand names.`,
      },
    ],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join(" ");
}

// Extract tracked brand mentions AND all other brand names mentioned
async function extractMentions(
  aiResponse: string,
  brandName: string,
  competitors: string[]
): Promise<{ tracked: string[]; others: string[] }> {
  const allTracked = [brandName, ...competitors];
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `From this AI response, identify brand mentions.

Tracked brands to look for (use fuzzy matching — partial name matches count, e.g. "Yoga Bar" matches "Yoga Bar by ITC" or "YogaBar"):
${allTracked.join(", ")}

AI Response:
"${aiResponse}"

Instructions:
- For "tracked": return the EXACT name from the tracked list above for any brand that appears in the response, even partially or with slight variations
- For "others": return any OTHER brand or product names mentioned that are NOT in the tracked list
- Exclude generic words like "protein bar", "supplement", etc. — only actual brand names

Respond in this exact JSON format:
{
  "tracked": ["exact names from tracked list that appear"],
  "others": ["other brand names mentioned not in tracked list"]
}

Only return JSON, nothing else.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return parseJSON(text);
  } catch {
    return { tracked: [], others: [] };
  }
}

async function generateRecommendations(
  brand: BrandIntelligence,
  citationScore: number,
  competitorScores: Record<string, number>,
  winningBrands: Record<string, number>,
  totalPrompts: number
) {
  const competitorContext = Object.entries(competitorScores)
    .map(([c, s]) => `${c}: ${s}/${totalPrompts}`)
    .join(", ");

  const winnerContext =
    Object.entries(winningBrands)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([b, s]) => `${b}: ${s} mentions`)
      .join(", ") || "none detected";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a GEO (Generative Engine Optimization) consultant. Write 5 specific, actionable recommendations for "${brand.brandName}" based on this AI visibility audit.

Brand context:
- Category: ${brand.category}
- Primary market: ${brand.geography.primary}
- Maturity: ${brand.maturity}
- Core differentiation: ${brand.coreDifferentiation}
- Purchase trigger: ${brand.purchaseTrigger}

Audit results:
- ${brand.brandName} citation score: ${citationScore}/${totalPrompts} prompts
- Direct competitor scores: ${competitorContext}
- Brands actually winning in AI responses: ${winnerContext}

Write recommendations that are:
1. Specific to their geography (${brand.geography.primary}) and category
2. Prioritized by what will move their AI citation score fastest
3. Concrete — name specific subreddits, platforms, content types, not generic advice
4. Aware of who is actually winning (the brands above) and why

Focus areas:
- Third-party presence gaps (which specific platforms matter for this category + geography)
- Content structure improvements for AI retrieval
- Entity clarity across Wikipedia, Crunchbase, LinkedIn
- Comparison and persona-specific content gaps

Respond in this exact JSON format:
{
  "recommendations": [
    {
      "title": "string",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "detail": "string (2-3 sentences, very specific and actionable)"
    }
  ]
}

Only return JSON, nothing else.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return parseJSON(text).recommendations;
}

export async function POST(req: NextRequest) {
  try {
    const {
      url,
      brand,
      prompts,
    }: { url?: string; brand: BrandIntelligence; prompts: AuditPrompt[] } =
      await req.json();

    if (!brand || !prompts?.length) {
      return NextResponse.json(
        { error: "Brand and prompts are required" },
        { status: 400 }
      );
    }

    // Normalize competitor names — strip parent company in parentheses
    // e.g. "Yoga Bar (ITC)" → "Yoga Bar", "RiteBite Max Protein (Zydus)" → "RiteBite Max Protein"
    const normalizedCompetitors = brand.competitors.map((c) =>
      c.replace(/\s*\([^)]*\)/g, "").trim()
    );

    const citationCounts: Record<string, number> = {
      [brand.brandName]: 0,
    };
    normalizedCompetitors.forEach((c) => {
      citationCounts[c] = 0;
    });

    // Aggregate all "other" brand mentions across prompts
    const winningBrands: Record<string, number> = {};

    // Run up to 8 prompts (cost-balanced)
    const promptsToRun = prompts.slice(0, 8);

    for (const prompt of promptsToRun) {
      try {
        const aiResponse = await queryWithWebSearch(prompt.text);
        const { tracked, others } = await extractMentions(
          aiResponse,
          brand.brandName,
          normalizedCompetitors
        );

        tracked.forEach((m) => {
          if (citationCounts[m] !== undefined) citationCounts[m]++;
        });

        others.forEach((b) => {
          winningBrands[b] = (winningBrands[b] || 0) + 1;
        });
      } catch {
        // skip failed prompts silently
      }
    }

    const totalPrompts = promptsToRun.length;
    const brandScore = citationCounts[brand.brandName];
    const competitorScores = { ...citationCounts };
    delete competitorScores[brand.brandName];

    const recommendations = await generateRecommendations(
      brand,
      brandScore,
      competitorScores,
      winningBrands,
      totalPrompts
    );

    let auditId: string | null = null;
    try {
      auditId = nanoid(12);
      await createAudit({
        id: auditId,
        url: url ?? "",
        brand,
        prompts: promptsToRun,
        result: {
          citationScore: brandScore,
          totalPrompts,
          citationRate: Math.round((brandScore / totalPrompts) * 100),
          competitorScores,
          winningBrands,
          recommendations,
        },
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to persist audit to Blob:", err);
      auditId = null;
    }

    return NextResponse.json({
      auditId,
      citationScore: brandScore,
      totalPrompts,
      citationRate: Math.round((brandScore / totalPrompts) * 100),
      competitorScores,
      winningBrands,
      prompts: promptsToRun,
      recommendations,
    });
  } catch (error) {
    console.error("Run error:", error);
    return NextResponse.json(
      { error: "Audit run failed. Try again." },
      { status: 500 }
    );
  }
}
