import type { StoredAudit } from "./audit-store";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://geo-audit-ebon.vercel.app"
  );
}

export function renderReport(audit: StoredAudit): string {
  const { brand, result, prompts } = audit;
  const reportUrl = `${siteUrl()}/report/${audit.id}`;

  const competitorLines = Object.entries(result.competitorScores)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([name, score]) => `- **${name}** — ${score}/${result.totalPrompts}`
    )
    .join("\n");

  const trackedLower = [brand.brandName, ...brand.competitors].map((n) =>
    n
      .replace(/\s*\([^)]*\)/g, "")
      .trim()
      .toLowerCase()
  );

  const winners = Object.entries(result.winningBrands)
    .filter(
      ([name, count]) =>
        count > result.citationScore &&
        !trackedLower.includes(name.toLowerCase())
    )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const winnerLines = winners.length
    ? winners
        .map(
          ([name, count]) =>
            `- **${name}** — cited in ${count} of ${result.totalPrompts} prompts`
        )
        .join("\n")
    : "_No untracked brands beat you in this run._";

  const recLines = result.recommendations
    .map(
      (r, i) =>
        `### ${i + 1}. ${r.title}\n**Impact:** ${r.impact} · **Effort:** ${r.effort}\n\n${r.detail}`
    )
    .join("\n\n");

  const promptLines = prompts
    .map((p) => `- _${p.text}_ (${p.type})`)
    .join("\n");

  return `Subject: Your AIVisible audit for ${brand.brandName} — ${result.citationRate}% citation rate

Hi,

Your AIVisible audit for **${brand.brandName}** is ready.

## 👉 Open your interactive action plan

**[${reportUrl}](${reportUrl})**

The action plan has copy-able post drafts, one-click links to the right subreddits and Wikipedia editors, and a checklist that saves your progress. Everything below is a summary — the plan is where you take action.

---

## Your citation score

**${result.citationRate}%** — cited in ${result.citationScore} of ${result.totalPrompts} prompts.

## Competitor benchmark

- **${brand.brandName}** (you) — ${result.citationScore}/${result.totalPrompts}
${competitorLines}

## Who's actually winning

Brands AI recommended more often than you in your category prompts:

${winnerLines}

## What to fix

${recLines}

## Prompts we tested

${promptLines}

---

Reply to this email if you want to talk through implementing any of these. Happy to advise.

— AIVisible
[${reportUrl}](${reportUrl})
`;
}
