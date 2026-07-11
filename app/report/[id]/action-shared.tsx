"use client";

import { useEffect, useState } from "react";

// Persist checklist state per (auditId, recIndex).
// Returns a { toggle, isChecked } helper backed by localStorage.
export function useChecklist(storageKey: string, items: string[]) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`checklist:${storageKey}`);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      // localStorage may be disabled in some browsing modes
    }
    setHydrated(true);
  }, [storageKey]);

  function toggle(item: string) {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      try {
        localStorage.setItem(`checklist:${storageKey}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const done = items.filter((i) => checked[i]).length;
  const total = items.length;

  return { checked, toggle, done, total, hydrated };
}

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={copy}
      className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 shrink-0"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export function ExternalLinkButton({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  const cls = primary
    ? "bg-gray-900 text-white hover:bg-gray-800"
    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-sm px-4 py-2 rounded-md inline-flex items-center gap-1 ${cls}`}
    >
      {children}
      <span className="text-xs opacity-60">↗</span>
    </a>
  );
}

export function Checklist({
  items,
  storageKey,
}: {
  items: string[];
  storageKey: string;
}) {
  const { checked, toggle, done, total, hydrated } = useChecklist(
    storageKey,
    items
  );

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <span className="font-medium">Steps</span>
        <span>
          {hydrated ? `${done}/${total}` : `0/${total}`}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <button
              onClick={() => toggle(item)}
              className={`shrink-0 w-4 h-4 mt-0.5 border rounded flex items-center justify-center transition-colors ${
                checked[item]
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-white border-gray-300 hover:border-gray-500"
              }`}
            >
              {checked[item] && <span className="text-[10px]">✓</span>}
            </button>
            <span
              className={`text-sm ${
                checked[item] ? "text-gray-400 line-through" : "text-gray-700"
              }`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
