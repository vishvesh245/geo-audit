"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { BrandIntelligence, AuditPrompt } from "./api/audit/analyze/route";
import ChatPlayground from "@/components/landing/chat-playground";
import Faq from "@/components/landing/faq";
import SampleAuditCard from "@/components/landing/sample-audit-card";
import { oatkindSample } from "@/lib/sample-audit";

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

  const [email, setEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [auditId, setAuditId] = useState<string | null>(null);

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
        body: JSON.stringify({ url, brand, prompts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setResult(data);
      if (data.auditId) setAuditId(data.auditId);
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

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || emailSubmitting || !auditId) return;
    setEmailSubmitting(true);
    setEmailError("");
    try {
      const res = await fetch(`/api/audit/${auditId}/capture-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit email");
      setEmailSubmitted(true);
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : "Failed to submit email"
      );
    } finally {
      setEmailSubmitting(false);
    }
  }

  function scrollToAuditInput() {
    document.getElementById("audit-input")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setTimeout(() => {
      document.getElementById("audit-input-field")?.focus();
    }, 400);
  }

  const allScores =
    result && brand
      ? [
          { name: brand.brandName, score: result.citationScore, isBrand: true },
          ...Object.entries(result.competitorScores).map(([name, score]) => ({
            name,
            score,
            isBrand: false,
          })),
        ].sort((a, b) => b.score - a.score)
      : [];

  const trackedNames = brand
    ? [brand.brandName, ...brand.competitors].map((n) =>
        n
          .replace(/\s*\([^)]*\)/g, "")
          .trim()
          .toLowerCase()
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

  const busy = phase === "analyzing" || phase === "running";

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="max-w-6xl mx-auto px-4 py-6">
        <span className="text-lg font-semibold text-gray-900">AIVisible</span>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-[1.1]">
          See who ChatGPT recommends in your category.
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Spoiler: probably not you. Watch a real AI answer for a real query,
          then run the audit on your own brand.
        </p>
      </section>

      {/* Chat playground */}
      <section className="max-w-4xl mx-auto px-4 pb-24">
        <ChatPlayground />
      </section>

      {/* Sub-hero URL input CTA */}
      <section
        id="audit-input"
        className="max-w-3xl mx-auto px-4 pt-4 pb-8 scroll-mt-6"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Run this on your own brand.
          </h2>
          <p className="text-sm text-gray-500">
            Free. Takes about 60 seconds. No signup for the score.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            id="audit-input-field"
            placeholder="https://yourwebsite.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && phase === "idle" && runAnalyze()
            }
            className="flex-1 h-12 text-base"
            disabled={busy}
          />
          <Button
            onClick={runAnalyze}
            disabled={!url || busy}
            className="h-12 px-6"
          >
            {phase === "analyzing"
              ? "Analyzing..."
              : "Get my citation score →"}
          </Button>
        </div>

        {busy && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-3">{stepMsg}</p>
              <Progress value={null} className="h-1" />
              <p className="text-xs text-gray-400 mt-3">
                {phase === "analyzing"
                  ? "About 10 seconds to identify brand and build prompts."
                  : "About 60 seconds. Querying AI engines across your prompt matrix."}
              </p>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Review phase: brand profile + prompt review */}
        {(phase === "review" || phase === "running") && brand && (
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{brand.brandName}</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {brand.category}
                    </p>
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
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-gray-400">Primary market:</span>
                  <span className="font-medium text-gray-700">
                    {brand.geography.primary}
                  </span>
                  {brand.geography.secondary.length > 0 && (
                    <span className="text-gray-400">
                      · also {brand.geography.secondary.join(", ")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 italic">
                  {brand.geography.geoContext}
                </p>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Buyer personas</p>
                  <div className="space-y-1">
                    {brand.personas.map((p, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium text-gray-700">
                          {p.name}
                        </span>
                        <span className="text-gray-500">, {p.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Core differentiation
                  </p>
                  <p className="text-sm font-medium text-gray-700">
                    {brand.coreDifferentiation}
                  </p>
                </div>
              </CardContent>
            </Card>

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
                    <div key={i} className="flex items-start gap-2 group">
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 mt-0.5 ${promptTypeColor[p.type]}`}
                      >
                        {p.type}
                      </Badge>
                      <p className="text-sm text-gray-600 flex-1">{p.text}</p>
                      {p.geo && (
                        <span className="text-xs text-gray-300 shrink-0">
                          {p.geo}
                        </span>
                      )}
                      {phase === "review" && (
                        <button
                          onClick={() => removePrompt(i)}
                          className="text-gray-300 hover:text-red-400 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove prompt ${i + 1}`}
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
      </section>

      {/* Results OR Sample audit preview */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        {phase === "done" && result && brand ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Your audit for {brand.brandName}
              </h2>
              <p className="text-sm text-gray-500">
                Free tier. Full breakdown emailed below.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Citation Score</CardTitle>
                <p className="text-sm text-gray-500">
                  How often your brand appears when buyers ask AI about your
                  category.
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
                          {name}
                          {isBrand && (
                            <span className="text-xs text-emerald-600 ml-1.5">
                              you
                            </span>
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

            {topWinners.length > 0 && (
              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Who&apos;s Actually Winning
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Brands AI recommended most in your category prompts.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topWinners.slice(0, 2).map(([name, count]) => (
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
                    {topWinners.length > 2 && (
                      <p className="text-sm text-gray-400 italic pt-2 text-center">
                        + {topWinners.length - 2} more winning brands in your
                        emailed report
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What to fix</CardTitle>
                <p className="text-sm text-gray-500">
                  Prioritized by impact on AI visibility in{" "}
                  {brand.geography.primary}.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-lg overflow-hidden"
                  >
                    <div className="p-4 flex items-start gap-3">
                      <span className="text-xs text-gray-400 font-mono shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-900 flex-1">
                        {r.title}
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                      Full details in emailed report
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                What your report looks like
              </h2>
              <p className="text-sm text-gray-500 max-w-xl mx-auto">
                Here&apos;s an audit for Oatkind, a hypothetical D2C brand we
                use to demo the tool. Yours will look similar.
              </p>
            </div>
            <SampleAuditCard data={oatkindSample} />
          </div>
        )}
      </section>

      {/* Email capture card */}
      <section className="max-w-2xl mx-auto px-4 pb-20">
        <div className="bg-gray-900 text-white rounded-2xl p-8 shadow-lg">
          {emailSubmitted ? (
            <div className="text-center py-2 space-y-3">
              <h2 className="text-xl font-semibold">
                Your report is on its way.
              </h2>
              <p className="text-sm text-gray-300">
                We&apos;ll email the full breakdown to{" "}
                <span className="text-white">{email}</span>{" "}within 24
                hours.
              </p>
              {auditId && (
                <a
                  href={`/report/${auditId}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-300 hover:text-emerald-200 border border-emerald-400/40 hover:border-emerald-400 rounded-md px-4 py-2 transition-colors"
                >
                  Or view your action plan now
                  <span className="text-xs">→</span>
                </a>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">
                Get the full report
              </h2>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                The complete list of winning brands, all 5 recommendations with
                full detail, and a per-prompt breakdown showing exactly where
                you&apos;re losing. In your inbox within 24 hours.
              </p>
              {!auditId ? (
                <p className="text-sm text-emerald-300 bg-white/5 border border-white/10 rounded-md px-4 py-3">
                  Run an audit above first. Then we can email you the full
                  breakdown for your brand.
                </p>
              ) : (
                <form
                  onSubmit={submitEmail}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <Input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 h-11 bg-white text-gray-900"
                    disabled={emailSubmitting}
                  />
                  <Button
                    type="submit"
                    disabled={!email || emailSubmitting}
                    className="h-11 bg-emerald-500 hover:bg-emerald-600 text-white px-5"
                  >
                    {emailSubmitting
                      ? "Sending..."
                      : "Send me the full report"}
                  </Button>
                </form>
              )}
              {emailError && (
                <p className="text-sm text-red-300 mt-3">{emailError}</p>
              )}
            </>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Questions people ask
          </h2>
        </div>
        <Faq />
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Ready to see where you stand?
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Enter your URL. Get your score in about 60 seconds.
        </p>
        <Button
          onClick={scrollToAuditInput}
          className="h-12 px-8 text-base"
        >
          Get my citation score →
        </Button>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 border-t border-gray-100 text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>AIVisible</span>
        <span>hello@aivisible.io</span>
      </footer>
    </main>
  );
}
