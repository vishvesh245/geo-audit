# GEO Audit — Project Notes

## What This Is

A tool that audits how visible a brand is in AI-generated search answers (ChatGPT, Perplexity, Gemini). Enter a website URL, get a full AI citation score, competitor benchmark, and actionable recommendations.

Live: https://geo-audit-ebon.vercel.app
GitHub: https://github.com/vishvesh245/geo-audit

---

## Why It Exists

GEO (Generative Engine Optimization) is an emerging space. Brands optimizing for Google rankings are losing discovery to competitors who show up in AI-generated answers. No tool currently helps brands build the third-party presence (Reddit, G2, review sites) that drives AI citations — existing tools only monitor, they don't fix.

Target customers: D2C and SaaS brands ($5M-$50M revenue) with existing SEO investment and stagnating organic traffic.

---

## Architecture

### Two-phase flow

**Phase 1 — Analyze** (`/api/audit/analyze`)
- Claude Sonnet + web search analyzes the brand URL
- Returns: brand name, category, geography (primary + secondary markets), buyer personas (2-3), maturity stage, purchase trigger, core differentiation, top 5 competitors
- Generates a 20-prompt matrix across 5 types: awareness, persona, consideration, comparison, decision
- Prompts are geo-calibrated and AI-native phrased (conversational, not keyword-style)
- User sees Brand Profile card + all prompts before any expensive queries run — can remove irrelevant prompts

**Phase 2 — Run** (`/api/audit/run`)
- Runs up to 8 prompts (cost-balanced)
- Per prompt: Claude Haiku + web search → get AI answer → extract brand mentions (tracked + untracked)
- Tracked brands: audited brand + normalized competitors
- Untracked brands: any other brand mentioned, aggregated as "Who's Actually Winning"
- Claude Sonnet generates 5 geo-specific, category-specific recommendations

### Key decisions

**Why two phases instead of one?**
First version was one-shot and returned 0% with no explanation. Users didn't trust it. Two-phase lets users see what's being tested before credits are spent — builds trust and lets them correct wrong inferences (e.g. wrong geography).

**Why Claude web search instead of Perplexity API?**
Perplexity API requires a separate key customers don't have. Claude's `web_search_20250305` tool is built-in. Also more relevant — we're measuring visibility in Claude's answers, which is a major AI search surface itself.

**Why Haiku for web search queries, Sonnet for analysis?**
Web search queries only need to retrieve brand names from results — Haiku is sufficient and 5x cheaper. Sonnet is reserved for brand intelligence extraction, prompt generation, and recommendations where reasoning quality matters.

**Competitor name normalization**
Claude sometimes returns competitors with parent company in parentheses e.g. "Yoga Bar (ITC)". This breaks exact-match citation extraction. All competitor names are stripped of parenthetical content before tracking: `name.replace(/\s*\([^)]*\)/g, "").trim()`.

**Fuzzy citation extraction**
Extraction prompt explicitly instructs Claude to use fuzzy matching — "Yoga Bar" should match "Yoga Bar by ITC" or "YogaBar". Prevents false 0 scores due to minor name variations in AI responses.

**"Who's Actually Winning" threshold**
Only shows brands scoring strictly higher than the audited brand. 1/8 mentions is noise, not winning. Also filters out brands already in the tracked competitor list to avoid duplicates.

**JSON parsing robustness**
Claude sometimes wraps JSON in markdown code fences even when told not to. All JSON parsing goes through a `parseJSON()` helper that strips ` ```json ``` ` before parsing.

---

## Cost per audit

~$0.15-0.25 per full audit run:
- Phase 1 (analyze + prompts): ~$0.05 (2 Sonnet calls with web search)
- Phase 2 (8 queries): ~$0.10-0.15 (8 Haiku web search + 8 Haiku extractions + 1 Sonnet recommendations)

---

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Anthropic SDK (`@anthropic-ai/sdk`)
- Deployed on Vercel

---

## Environment Variables

| Key | Where | Purpose |
|-----|-------|---------|
| `ANTHROPIC_API_KEY` | Vercel + `.env.local` | All Claude API calls |

Perplexity key was originally planned but dropped — Claude web search replaces it.

---

## File Structure

```
app/
  page.tsx                    — Two-phase UI (idle → analyzing → review → running → done)
  api/
    audit/
      analyze/route.ts        — Brand intelligence + prompt matrix generation
      run/route.ts            — Citation queries + recommendations
      route.ts                — Old single-phase route (unused, keep for reference)
components/ui/                — shadcn components (button, card, input, badge, progress)
lib/utils.ts                  — shadcn utility
```

---

## What's Next (planned)

- Third-party footprint audit: check G2 review count, Reddit presence, Wikipedia existence per brand
- Email capture gate before showing full results (lead gen)
- Shareable report link (store results, generate public URL)
- Dashboard version: re-run audits over time, track citation score trend
- Pitch deck / one-pager for selling GEO audits to brands
