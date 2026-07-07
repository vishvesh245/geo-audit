"use client";

import { useState } from "react";
import { markAuditAsSent } from "./actions";
import type { StoredAudit } from "@/lib/audit-store";

type Item = { audit: StoredAudit; report: string };

export default function QueueList({ items }: { items: Item[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(
    items[0]?.audit.id ?? null
  );

  return (
    <div className="space-y-4">
      {items.map(({ audit, report }) => (
        <QueueRow
          key={audit.id}
          audit={audit}
          report={report}
          expanded={expandedId === audit.id}
          onToggle={() =>
            setExpandedId(expandedId === audit.id ? null : audit.id)
          }
        />
      ))}
    </div>
  );
}

function QueueRow({
  audit,
  report,
  expanded,
  onToggle,
}: {
  audit: StoredAudit;
  report: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback if clipboard API is unavailable
      alert("Copy failed. Select the text below and copy manually.");
    }
  }

  async function handleMarkSent() {
    setMarking(true);
    try {
      await markAuditAsSent(audit.id);
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {audit.brand.brandName}
            <span className="text-gray-500 font-normal ml-2">
              {audit.result.citationRate}% ({audit.result.citationScore}/
              {audit.result.totalPrompts})
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {audit.email} · {new Date(audit.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="text-xs text-gray-400">
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copy}
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
              >
                {copied ? "Copied to clipboard" : "Copy report markdown"}
              </button>
              <a
                href={`mailto:${audit.email}?subject=${encodeURIComponent(
                  `Your AIVisible audit for ${audit.brand.brandName} — ${audit.result.citationRate}% citation rate`
                )}`}
                className="text-sm bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
              >
                Open in mail client
              </a>
              <button
                onClick={handleMarkSent}
                disabled={marking}
                className="text-sm bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 disabled:opacity-50"
              >
                {marking ? "Marking..." : "Mark as sent"}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs whitespace-pre-wrap font-mono max-h-[600px] overflow-y-auto">
              {report}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
