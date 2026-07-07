"use client";

import { type SampleAudit } from "@/lib/sample-audit";

type Props = {
  data: SampleAudit;
  label?: string;
};

export default function SampleAuditCard({ data, label = "Sample" }: Props) {
  const allBars = [
    { name: data.brandName, score: data.citationScore, isBrand: true },
    ...data.competitors.map((c) => ({ ...c, isBrand: false })),
  ].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-500">
        <span className="uppercase tracking-wider font-medium text-gray-400 mr-2">
          {label} audit
        </span>
        <span className="text-gray-700 font-medium">{data.brandName}</span>
        <span className="text-gray-400">
          {" "}
          · {data.category} · {data.market}
        </span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-end gap-3 mb-1">
          <span className="text-5xl font-bold text-gray-900">
            {data.citationRate}%
          </span>
          <span className="text-gray-400 text-sm mb-2">
            ({data.citationScore} of {data.totalPrompts} prompts)
          </span>
        </div>
        <p className="text-sm text-gray-500">AI Citation Score</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-sm font-medium text-gray-900 mb-1">
          You vs your tracked competitors
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Prompts each brand was cited in
        </p>
        <div className="space-y-3">
          {allBars.map((bar) => {
            const pct = (bar.score / data.totalPrompts) * 100;
            return (
              <div key={bar.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span
                    className={
                      bar.isBrand
                        ? "font-semibold text-gray-900"
                        : "text-gray-600"
                    }
                  >
                    {bar.name}
                    {bar.isBrand && (
                      <span className="text-xs text-emerald-600 ml-1.5">
                        you
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500">
                    {bar.score}/{data.totalPrompts}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      bar.isBrand ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-orange-100 rounded-xl p-6">
        <p className="text-sm font-medium text-gray-900 mb-1">
          Who&apos;s Actually Winning
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Brands AI recommended most in your category, including some not on
          your radar.
        </p>
        <div className="space-y-3">
          {data.winners.map((w) => {
            const pct = (w.score / data.totalPrompts) * 100;
            return (
              <div key={w.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{w.name}</span>
                  <span className="text-gray-500">
                    {w.score}/{data.totalPrompts}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-300 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-orange-700 mt-4 bg-orange-50 rounded p-3">
          These brands aren&apos;t in {data.brandName}&apos;s competitor set. AI
          recommends them anyway.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-sm font-medium text-gray-900 mb-1">What to fix</p>
        <p className="text-xs text-gray-500 mb-4">
          Prioritized by impact on AI visibility in {data.market}.
        </p>
        <div className="space-y-2">
          {data.recommendations.map((r, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-lg overflow-hidden"
            >
              <div className="px-4 py-3 flex items-start gap-3">
                <span className="text-xs text-gray-400 font-mono shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-gray-900 flex-1">{r}</p>
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                Full details in emailed report
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
