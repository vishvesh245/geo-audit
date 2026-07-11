import { getAudit } from "@/lib/audit-store";
import { notFound } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionCard } from "./action-card";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getAudit(id);
  if (!audit) notFound();

  const { brand, result, prompts } = audit;

  const allScores = [
    { name: brand.brandName, score: result.citationScore, isBrand: true },
    ...Object.entries(result.competitorScores).map(([name, score]) => ({
      name,
      score,
      isBrand: false,
    })),
  ].sort((a, b) => b.score - a.score);

  const trackedLower = [brand.brandName, ...brand.competitors].map((n) =>
    n
      .replace(/\s*\([^)]*\)/g, "")
      .trim()
      .toLowerCase()
  );

  const topWinners = Object.entries(result.winningBrands)
    .filter(
      ([name, count]) =>
        count > result.citationScore &&
        !trackedLower.includes(name.toLowerCase())
    )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
        {/* Header */}
        <header className="mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
            AIVisible action plan
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            {brand.brandName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{brand.category}</p>
        </header>

        {/* Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Citation Score</CardTitle>
            <p className="text-sm text-gray-500">
              How often your brand appears when buyers ask AI about your
              category
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-bold text-gray-900">
                {result.citationRate}%
              </span>
              <span className="text-gray-400 text-sm mb-2">
                ({result.citationScore} of {result.totalPrompts} prompts)
              </span>
            </div>
            <div className="space-y-3">
              {allScores.map(({ name, score, isBrand }) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span
                      className={
                        isBrand
                          ? "font-semibold text-gray-900"
                          : "text-gray-600"
                      }
                    >
                      {name}{" "}
                      {isBrand && (
                        <span className="text-xs text-blue-500 ml-1">you</span>
                      )}
                    </span>
                    <span className="text-gray-500">
                      {score}/{result.totalPrompts}
                    </span>
                  </div>
                  <Progress
                    value={(score / result.totalPrompts) * 100}
                    className={`h-2 ${isBrand ? "" : "opacity-50"}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Who's Winning */}
        {topWinners.length > 0 && (
          <Card className="border-orange-100">
            <CardHeader>
              <CardTitle className="text-lg">
                Who&apos;s Actually Winning
              </CardTitle>
              <p className="text-sm text-gray-500">
                Brands AI recommended most often in your category prompts
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topWinners.map(([name, count]) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{name}</span>
                      <span className="text-gray-500">
                        {count}/{result.totalPrompts}
                      </span>
                    </div>
                    <Progress
                      value={(count / result.totalPrompts) * 100}
                      className="h-2 opacity-60"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Action Plan</CardTitle>
            <p className="text-sm text-gray-500">
              Each recommendation includes ready-to-use assets. Click to open
              the linked platform or copy templates. Progress saves to your
              browser.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.recommendations.map((rec, i) => (
              <ActionCard
                key={i}
                auditId={id}
                recIndex={i}
                brandName={brand.brandName}
                rec={rec}
              />
            ))}
          </CardContent>
        </Card>

        {/* Prompts Tested */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prompts We Tested</CardTitle>
            <p className="text-sm text-gray-500">
              The buyer queries we ran your brand against
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prompts.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs shrink-0 mt-0.5 bg-gray-50 text-gray-600"
                  >
                    {p.type}
                  </Badge>
                  <p className="text-sm text-gray-600 flex-1">{p.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-gray-400 pt-6 pb-4">
          Bookmark this URL — your progress is saved here.
        </footer>
      </div>
    </main>
  );
}
