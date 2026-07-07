"use client";

import { useEffect, useState } from "react";
import { chatScripts, type ChatScript } from "@/lib/chat-scripts";

type RenderedSegment = { text: string; highlighted: boolean };

const CHAR_MIN = 18;
const CHAR_MAX = 32;

export default function ChatPlayground() {
  const [activeId, setActiveId] = useState<ChatScript["id"]>(chatScripts[0].id);
  const [segments, setSegments] = useState<RenderedSegment[]>([]);
  const [done, setDone] = useState(false);

  const active = chatScripts.find((s) => s.id === activeId) ?? chatScripts[0];

  useEffect(() => {
    const cancel = { flag: false };
    setSegments([]);
    setDone(false);

    async function stream() {
      const script =
        chatScripts.find((s) => s.id === activeId) ?? chatScripts[0];
      await new Promise((r) => setTimeout(r, 250));
      if (cancel.flag) return;

      for (const seg of script.response) {
        if (cancel.flag) return;
        if ("p" in seg) {
          await new Promise((r) => setTimeout(r, seg.p));
          continue;
        }
        const text = "h" in seg ? seg.h : seg.t;
        const highlighted = "h" in seg;
        setSegments((prev) => [...prev, { text: "", highlighted }]);
        for (const char of text) {
          if (cancel.flag) return;
          setSegments((prev) => {
            const copy = [...prev];
            const last = copy.length - 1;
            copy[last] = {
              text: copy[last].text + char,
              highlighted: copy[last].highlighted,
            };
            return copy;
          });
          const jitter = CHAR_MIN + Math.random() * (CHAR_MAX - CHAR_MIN);
          const extra = char === "," ? 120 : char === "." ? 220 : 0;
          await new Promise((r) => setTimeout(r, jitter + extra));
        }
      }
      if (!cancel.flag) setDone(true);
    }

    stream();

    return () => {
      cancel.flag = true;
    };
  }, [activeId]);

  return (
    <div className="w-full">
      <p className="text-xs text-gray-400 mb-3 text-center uppercase tracking-wider">
        Pick a query type
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {chatScripts.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              activeId === s.id
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-400"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          </div>
          <span className="text-xs text-gray-400 ml-2">
            AI Search · Live demo
          </span>
        </div>

        <div className="p-6 space-y-4 min-h-[300px]">
          <div className="flex justify-end">
            <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-gray-800">
              {active.query}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              AI
            </div>
            <div className="flex-1 text-sm text-gray-800 leading-relaxed">
              {segments.map((seg, i) => (
                <span
                  key={i}
                  className={
                    seg.highlighted
                      ? "bg-emerald-100 text-emerald-900 rounded px-1 font-medium"
                      : ""
                  }
                >
                  {seg.text}
                </span>
              ))}
              {!done && (
                <span
                  className="inline-block w-1.5 h-3.5 bg-gray-400 ml-0.5 align-middle animate-pulse"
                  aria-hidden
                />
              )}
            </div>
          </div>

          {done && (
            <div className="ml-11 mt-3 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">
              {active.callout}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
