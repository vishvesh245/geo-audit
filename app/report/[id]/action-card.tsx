"use client";

import type { Recommendation } from "@/lib/audit-store";
import { Badge } from "@/components/ui/badge";
import { RedditAction } from "./reddit-action";
import { WikipediaAction } from "./wikipedia-action";
import { ComparisonAction } from "./comparison-action";

const impactColor: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const typeLabel: Record<string, string> = {
  reddit: "Reddit",
  wikipedia: "Wikipedia",
  comparison: "Comparison content",
  other: "Other",
};

const typeColor: Record<string, string> = {
  reddit: "bg-orange-50 text-orange-700 border-orange-200",
  wikipedia: "bg-gray-100 text-gray-700 border-gray-300",
  comparison: "bg-blue-50 text-blue-700 border-blue-200",
  other: "bg-gray-50 text-gray-500 border-gray-200",
};

export function ActionCard({
  auditId,
  recIndex,
  brandName,
  rec,
}: {
  auditId: string;
  recIndex: number;
  brandName: string;
  rec: Recommendation;
}) {
  const storageKey = `${auditId}:${recIndex}`;
  const at = rec.actionType ?? "other";

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{rec.title}</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{rec.detail}</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0 items-end">
          <Badge
            variant="outline"
            className={`text-xs ${typeColor[at]}`}
          >
            {typeLabel[at]}
          </Badge>
          <div className="flex gap-1.5">
            <Badge
              variant="outline"
              className={`text-xs ${impactColor[rec.impact]}`}
            >
              {rec.impact}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs bg-gray-100 text-gray-600"
            >
              {rec.effort}
            </Badge>
          </div>
        </div>
      </div>

      {rec.actionType === "reddit" && rec.actionMeta && (
        <RedditAction
          meta={rec.actionMeta}
          brandName={brandName}
          storageKey={storageKey}
        />
      )}
      {rec.actionType === "wikipedia" && rec.actionMeta && (
        <WikipediaAction
          meta={rec.actionMeta}
          brandName={brandName}
          storageKey={storageKey}
        />
      )}
      {rec.actionType === "comparison" && rec.actionMeta && (
        <ComparisonAction
          meta={rec.actionMeta}
          brandName={brandName}
          storageKey={storageKey}
        />
      )}
    </div>
  );
}
