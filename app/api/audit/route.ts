import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJSON(text: string) {
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/```\s*$/m, "").trim();
  return JSON.parse(cleaned);
}

// Step 1: Identify category and competitors from website URL
async function identifyBrand(url: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Given the website URL "${url}", identify:
1. The brand name
2. Their primary category (e.g. "B2B SaaS / Project Management" or "D2C Skincare")
3. Their top 5 direct competitors (brand names only)
4. A one-line description of what the brand does

Respond in this exact JSON format:
{
  "brandName": "string",
  "category": "string",
  "competitors": ["string", "string", "string", "string", "string"],
  "description": "string"
}

Only return JSON, nothing else.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return parseJSON(text);
}

// Step 2: Generate 20 category-level buyer prompts
async function generatePrompts(
  brandName: string,
  category: string,
  description: string
) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are helping audit AI search visibility for "${brandName}", a brand in the "${category}" space. They ${description}.

Generate 20 prompts that a real buyer or user would type into ChatGPT, Perplexity, or Google AI to discover solutions in this category.

Rules:
- Do NOT use the brand name in any prompt — these must be category-level discovery prompts
- Mix awareness prompts (broad), consideration prompts (comparing options), and decision prompts (specific use case)
- Make them realistic, like something a person would actually type

Respond in this exact JSON format:
{
  "prompts": [
    { "text": "string", "type": "awareness|consideration|decision" }
  ]
}

Only return JSON, nothing else.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return parseJSON(text).prompts;
}

// Step 3: Run a prompt using Claude with web search and return the answer
async function queryWithWebSearch(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nList the top tools, brands, or products you would recommend. Be specific with brand names.`,
      },
    ],
  });

  // Extract all text blocks from the response (post-search answer)
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join(" ");
}

// Step 4: Extract brand mentions from an AI response
async function extractMentions(
  aiResponse: string,
  brandName: string,
  competitors: string[]
): Promise<string[]> {
  const allBrands = [brandName, ...competitors];
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `From this AI response, identify which of these brands are mentioned or recommended: ${allBrands.join(", ")}

AI Response:
"${aiResponse}"

Return only a JSON array of brand names that appear (exactly as listed above). Example: ["Notion", "Asana"]
If none are mentioned, return [].
Only return the JSON array, nothing else.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    return parseJSON(text);
  } catch {
    return [];
  }
}

// Step 5: Generate recommendations based on audit data
async function generateRecommendations(
  brandName: string,
  category: string,
  citationScore: number,
  competitorScores: Record<string, number>,
  totalPrompts: number
) {
  const scoreContext = Object.entries(competitorScores)
    .map(([c, s]) => `${c}: ${s}/${totalPrompts}`)
    .join(", ");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a GEO (Generative Engine Optimization) consultant. Based on this AI visibility audit for "${brandName}" in the "${category}" space:

- ${brandName} citation score: ${citationScore}/${totalPrompts} prompts
- Competitor scores: ${scoreContext}

Write 5 specific, actionable recommendations to improve their AI search visibility. Focus on:
1. Third-party presence (Reddit, G2, Capterra, review sites relevant to their category)
2. Content structure improvements
3. Entity clarity (Wikipedia, Crunchbase, LinkedIn consistency)
4. Category-specific tactics

Respond in this exact JSON format:
{
  "recommendations": [
    {
      "title": "string",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "detail": "string (2-3 sentences, specific and actionable)"
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
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Step 1: Identify brand
    const brand = await identifyBrand(url);

    // Step 2: Generate prompts
    const prompts = await generatePrompts(
      brand.brandName,
      brand.category,
      brand.description
    );

    // Step 3 & 4: Run prompts and extract citations
    const citationCounts: Record<string, number> = {
      [brand.brandName]: 0,
    };
    brand.competitors.forEach((c: string) => {
      citationCounts[c] = 0;
    });

    // Run 5 prompts to balance cost vs coverage (~$0.10-0.20 per audit)
    const promptsToRun = prompts.slice(0, 5);
    for (const prompt of promptsToRun) {
      try {
        const aiResponse = await queryWithWebSearch(prompt.text);
        const mentions = await extractMentions(
          aiResponse,
          brand.brandName,
          brand.competitors
        );
        mentions.forEach((m: string) => {
          if (citationCounts[m] !== undefined) {
            citationCounts[m]++;
          }
        });
      } catch {
        // skip failed prompts, don't break the whole audit
      }
    }

    const totalPrompts = promptsToRun.length;
    const brandScore = citationCounts[brand.brandName];
    const competitorScores = { ...citationCounts };
    delete competitorScores[brand.brandName];

    // Step 5: Generate recommendations
    const recommendations = await generateRecommendations(
      brand.brandName,
      brand.category,
      brandScore,
      competitorScores,
      totalPrompts
    );

    return NextResponse.json({
      brand,
      citationScore: brandScore,
      totalPrompts,
      citationRate: Math.round((brandScore / totalPrompts) * 100),
      competitorScores,
      prompts: promptsToRun,
      recommendations,
    });
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json(
      { error: "Audit failed. Check API keys and try again." },
      { status: 500 }
    );
  }
}
