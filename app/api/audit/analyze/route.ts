import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJSON(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/```\s*$/m, "")
    .trim();
  return JSON.parse(cleaned);
}

export type BrandIntelligence = {
  brandName: string;
  category: string;
  description: string;
  geography: {
    primary: string;
    secondary: string[];
    geoContext: string; // e.g. "India-first brand, also ships to UAE and Singapore"
  };
  personas: Array<{ name: string; description: string }>;
  maturity: "early" | "growth" | "established";
  purchaseTrigger: "discovery" | "loyalty" | "comparison";
  coreDifferentiation: string;
  competitors: string[];
};

export type AuditPrompt = {
  text: string;
  type: "awareness" | "consideration" | "decision" | "comparison" | "persona";
  persona?: string;
  geo?: string;
};

async function analyzeBrand(url: string): Promise<BrandIntelligence> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Analyze the brand at "${url}" by searching for information about them. Extract:

1. Brand name
2. Primary product category (specific, e.g. "D2C Clean Label Protein Bars" not just "Food")
3. One-line description of what they do and their core differentiation
4. Geography: which country/region is their PRIMARY market? Are there secondary markets? Infer from domain TLD, currency, shipping, store locations, language, partnerships mentioned
5. Top 2-3 distinct buyer personas who would search for this product (be specific - e.g. "gym-going 25-35 year old male in metro India tracking macros" not just "health conscious person")
6. Brand maturity: early (< 2 years, limited awareness), growth (2-5 years, building awareness), or established (5+ years, strong recall)
7. Primary purchase trigger: discovery (people find them while searching for a category), loyalty (existing customers repurchasing), or comparison (people comparing options)
8. Core differentiation claim in one phrase (e.g. "no hidden ingredients", "cheapest protein", "best taste")
9. Top 5 direct competitors in their PRIMARY market

Respond in this exact JSON format:
{
  "brandName": "string",
  "category": "string",
  "description": "string",
  "geography": {
    "primary": "string (country name)",
    "secondary": ["string"],
    "geoContext": "string (1 sentence explaining geo inference)"
  },
  "personas": [
    { "name": "string (short label)", "description": "string (who they are and what they search for)" }
  ],
  "maturity": "early|growth|established",
  "purchaseTrigger": "discovery|loyalty|comparison",
  "coreDifferentiation": "string",
  "competitors": ["string", "string", "string", "string", "string"]
}

Only return JSON, nothing else.`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");

  return parseJSON(text);
}

async function generatePromptMatrix(
  brand: BrandIntelligence
): Promise<AuditPrompt[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Generate a structured prompt matrix for auditing the AI search visibility of "${brand.brandName}".

Brand context:
- Category: ${brand.category}
- Primary market: ${brand.geography.primary}
- Secondary markets: ${brand.geography.secondary.join(", ") || "none"}
- Geo context: ${brand.geography.geoContext}
- Maturity: ${brand.maturity}
- Purchase trigger: ${brand.purchaseTrigger}
- Core differentiation: ${brand.coreDifferentiation}
- Competitors: ${brand.competitors.join(", ")}
- Buyer personas: ${brand.personas.map((p) => `${p.name}: ${p.description}`).join(" | ")}

Generate exactly 20 prompts across these types. CRITICAL RULES:
- Do NOT use "${brand.brandName}" in any prompt - these are category discovery prompts
- Prompts must be phrased like a real person typing into ChatGPT or Perplexity - conversational, not keyword-style
- Geography must be embedded naturally where relevant (not forced - only when a real buyer would include it)
- Each prompt must reflect realistic search intent

Prompt type distribution:
- 4 awareness prompts: broad category discovery, geography-aware where natural
- 4 persona prompts: one per persona, phrased as that specific buyer would ask
- 4 consideration prompts: comparing options, evaluating tradeoffs
- 4 comparison prompts: direct competitor comparisons using actual competitor names
- 4 decision prompts: high intent, ready to buy, specific use case

Respond in this exact JSON format:
{
  "prompts": [
    {
      "text": "string",
      "type": "awareness|consideration|decision|comparison|persona",
      "persona": "string or null",
      "geo": "string (country/region this prompt is calibrated for) or null"
    }
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

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const brand = await analyzeBrand(url);
    const prompts = await generatePromptMatrix(brand);

    return NextResponse.json({ brand, prompts });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Check the URL and try again." },
      { status: 500 }
    );
  }
}
