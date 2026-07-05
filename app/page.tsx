"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { BrandIntelligence, AuditPrompt } from "./api/audit/analyze/route";

type Recommendation = {
  title: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  detail: string;
};

type RunResult = {
  citationScore: number;
  totalPrompts: number;
  citationRate: number;
  competitorScores: Record<string, number>;
  winningBrands: Record<string, number>;
  prompts: AuditPrompt[];
  recommendations: Recommendation[];
};

type Phase = "idle" | "analyzing" | "review" | "running" | "done";

const impactColor: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const promptTypeColor: Record<string, string> = {
  awareness: "bg-blue-50 text-blue-600",
  consideration: "bg-purple-50 text-purple-600",
  decision: "bg-green-50 text-green-600",
  comparison: "bg-orange-50 text-orange-600",
  persona: "bg-pink-50 text-pink-600",
};

const maturityLabel: Record<string, string> = {
  early: "Early stage",
  growth: "Growth stage",
  established: "Established",
};

const triggerLabel: Record<string, string> = {
  discovery: "Discovery purchase",
  loyalty: "Loyalty / repeat",
  comparison: "Comparison driven",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepMsg, setStepMsg] = useState("");
  const [error, setError] = useState("");

  const [brand, setBrand] = useState<BrandIntelligence | null>(null);
  const [prompts, setPrompts] = useState<AuditPrompt[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);

  // Phase 1: analyze brand + generate prompts
  async function runAnalyze() {
    if (!url) return;
    setPhase("analyzing");
    setError("");
    setResult(null);
    setBrand(null);

    const steps = [
      "Fetching brand website...",
      "Identifying geography and personas...",
      "Building prompt matrix...",
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < steps.length) setStepMsg(steps[i++]);
    }, 3000);

    try {
      const res = await fetch("/api/audit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setBrand(data.brand);
      setPrompts(data.prompts);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("idle");
    } finally {
      clearInterval(iv);
      setStepMsg("");
    }
  }

  // Phase 2: run citation queries
  async function runAudit() {
    if (!brand) return;
    setPhase("running");
    setError("");

    const steps = [
      "Querying AI search engines...",
      "Extracting brand citations...",
      "Identifying who's winning...",
      "Generating recommendations...",
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < steps.length) setStepMsg(steps[i++]);
    }, 6000);

    try {
      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, prompts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setResult(data);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("review");
    } finally {
      clearInterval(iv);
      setStepMsg("");
    }
  }

  function removePrompt(index: number) {
    setPrompts((prev) => prev.filter((_, i) => i !== index));
  }

  const allScores = result && brand
    ? [
        { name: brand.brandName, score: result.citationScore, isBrand: true },
        ...Object.entries(result.competitorScores).map(([name, score]) => ({
          name,
          score,
          isBrand: false,
        })),
      ].sort((a, b) => b.score - a.score)
    : [];

  // Only show brands scoring HIGHER than the audited brand — these are the actual winners
  const trackedNames = brand
    ? [brand.brandName, ...brand.competitors].map((n) =>
        n.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase()
      )
    : [];
  const topWinners = result
    ? Object.entries(result.winningBrands)
        .filter(
          ([name, count]) =>
            count > result.citationScore &&
            !trackedNames.includes(name.toLowerCase())
        )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
    : [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">AI Presence Audit</h1>
          <p className="text-gray-500 text-base">
            Enter your website. We identify your brand, generate smart prompts, and show exactly where you stand in AI search.
          </p>
        </div>

        {/* URL input — always visible */}
        <div className="flex gap-3 mb-8">
          <Input
            placeholder="https://yourwebsite.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && phase === "idle" && runAnalyze()
            }
            className="flex-1 h-12 text-base"
            disabled={phase === "analyzing" || phase === "running"}
          />
          <Button
            onClick={runAnalyze}
            disabled={!url || phase === "analyzing" || phase === "running"}
            className="h-12 px-6"
          >
            {phase === "analyzing" ? "Analyzing..." : "Analyze Brand"}
          </Button>
        </div>

        {/* Loading states */}
        {(phase === "analyzing" || phase === "running") && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-3">{stepMsg}</p>
              <Progress value={null} className="h-1" />
              <p className="text-xs text-gray-400 mt-3">
                {phase === "analyzing"
                  ? "~10 seconds to identify brand and build prompts."
                  : "~60 seconds. Querying AI engines across your prompt matrix."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Phase 2: Review */}
        {(phase === "review" || phase === "running" || phase === "done") && brand && (
          <div className="space-y-6 mb-6">
            {/* Brand Profile */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{brand.brandName}</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">{brand.category}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Badge variant="outline" className="text-xs">
                      {maturityLabel[brand.maturity]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {triggerLabel[brand.purchaseTrigger]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">{brand.description}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Primary market:</span>
                  <span className="font-medium text-gray-700">{brand.geography.primary}</span>
                  {brand.geography.secondary.length > 0 && (
                    <span className="text-gray-400">
                      · also {brand.geography.secondary.join(", ")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 italic">{brand.geography.geoContext}</p>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Buyer personas</p>
                  <div className="space-y-1">
                    {brand.personas.map((p, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium text-gray-700">{p.name}</span>
                        <span className="text-gray-500"> — {p.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Core differentiation</p>
                  <p className="text-sm font-medium text-gray-700">{brand.coreDifferentiation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Prompt Review */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prompts to Test</CardTitle>
                <p className="text-sm text-gray-500">
                  {phase === "review"
                    ? "Review and remove any prompts that don't fit. Then run the audit."
                    : "Prompts used in this audit."}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {prompts.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 group"
                    >
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 mt-0.5 ${promptTypeColor[p.type]}`}
                      >
                        {p.type}
                      </Badge>
                      <p className="text-sm text-gray-600 flex-1">{p.text}</p>
                      {p.geo && (
                        <span className="text-xs text-gray-300 shrink-0">{p.geo}</span>
                      )}
                      {phase === "review" && (
                        <button
                          onClick={() => removePrompt(i)}
                          className="text-gray-300 hover:text-red-400 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {phase === "review" && (
                  <Button onClick={runAudit} className="w-full h-11">
                    Run Audit ({prompts.length} prompts)
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Phase 3: Results */}
        {phase === "done" && result && brand && (
          <div className="space-y-6">
            {/* Citation Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Citation Score</CardTitle>
                <p className="text-sm text-gray-500">
                  How often your brand appears when buyers ask AI about your category
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
                        <span className={isBrand ? "font-semibold text-gray-900" : "text-gray-600"}>
                          {name}{" "}
                          {isBrand && <span className="text-xs text-blue-500 ml-1">you</span>}
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

            {/* Who's Actually Winning */}
            {topWinners.length > 0 && (
              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle className="text-lg">Who&apos;s Actually Winning</CardTitle>
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
                          <span className="text-gray-500">{count}/{result.totalPrompts}</span>
                        </div>
                        <Progress
                          value={(count / result.totalPrompts) * 100}
                          className="h-2 opacity-60"
                        />
                      </div>
                    ))}
                  </div>
                  {topWinners.some(([name]) =>
                    !brand.competitors.includes(name)
                  ) && (
                    <p className="text-xs text-orange-600 mt-4 bg-orange-50 rounded p-3">
                      Some of these brands aren&apos;t in your competitor list — they&apos;re winning AI search in your category anyway.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What to Fix</CardTitle>
                <p className="text-sm text-gray-500">
                  Prioritized by impact on AI visibility in {brand.geography.primary}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-gray-900 text-sm">{r.title}</p>
                      <div className="flex gap-2 shrink-0">
                        <Badge className={`text-xs ${impactColor[r.impact]}`} variant="outline">
                          {r.impact} impact
                        </Badge>
                        <Badge className="text-xs bg-gray-100 text-gray-600" variant="outline">
                          {r.effort} effort
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{r.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
