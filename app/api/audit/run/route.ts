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
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a GEO (Generative Engine Optimization) consultant. Write 5 actionable recommendations for "${brand.brandName}" — each one comes with ready-to-execute assets so the brand can act today.

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

Constrain recommendations to these THREE action types (with a rare "other" fallback if truly warranted):
- "reddit"     — seed authentic threads on a specific subreddit
- "wikipedia"  — publish a Wikipedia article about the brand
- "comparison" — publish a listicle or head-to-head comparison article

Target mix across the 5 recs: roughly 2 reddit + 1 wikipedia + 2 comparison. Adjust if the brand's context clearly demands otherwise.

For EACH recommendation, populate actionMeta with the exact fields for its type:

If actionType = "reddit", actionMeta must be:
{
  "subreddit": "SubredditName",   // real subreddit relevant to ${brand.geography.primary} + ${brand.category}, no "r/" prefix
  "postDrafts": [
    { "title": "...", "body": "..." },   // 2 post drafts. Body ~200-350 words, first-person, natural, not salesy. Reddit hates promotion — write as a real user would.
    { "title": "...", "body": "..." }
  ]
}

If actionType = "wikipedia", actionMeta must be:
{
  "articleTitle": "${brand.brandName} (${brand.category.split(" ")[0].toLowerCase()} brand)",
  "stubDraft": "'''${brand.brandName}''' is a ...\\n\\n== History ==\\n...\\n\\n== Products ==\\n...\\n\\n== References ==\\n<references/>",   // ~250-word wiki-markup draft with Overview, History, Products, References sections
  "suggestedSources": ["Real third-party source #1 with type", "Source #2", "..."]   // 3-5 concrete sources (news outlets, Crunchbase, industry mags) relevant to this brand + geography
}

If actionType = "comparison", actionMeta must be:
{
  "proposedTitle": "${brand.brandName} vs [top winner]: ...",   // click-worthy title
  "proposedOutline": ["## H2 heading 1", "## H2 heading 2", "..."],   // 5-7 H2 headings for the article
  "targetKeywords": ["kw 1", "kw 2", "..."]   // 5-7 SEO-friendly keywords/phrases
}

If actionType = "other", leave actionMeta as {}.

Recommendation rules:
1. Titles are imperative and specific ("Seed 3 authentic threads on r/IndianStreetwear", not "Improve Reddit presence").
2. Detail is 2-3 sentences on WHY this specific action beats alternatives.
3. Reference the actual competitors/winners by name when relevant.
4. Post drafts and comparison outlines must feel category-native to a reader from ${brand.geography.primary}.

Respond in this exact JSON:
{
  "recommendations": [
    {
      "title": "...",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "detail": "...",
      "actionType": "reddit|wikipedia|comparison|other",
      "actionMeta": { ... }
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
