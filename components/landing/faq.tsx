"use client";

import { useState } from "react";

const faqs = [
  {
    q: "How is this different from a rank tracker?",
    a: "Rank trackers measure your position on Google. AIVisible measures whether AI models mention your brand at all when your buyers ask them questions. Different surface, different game.",
  },
  {
    q: "Is it really free?",
    a: "The score and competitor benchmark are free with no signup. The detailed report is emailed after you drop your address. That report includes the winning brands list, full recommendations, and a per-prompt breakdown. No credit card, no plan, no upsell yet.",
  },
  {
    q: "How fast is the full report?",
    a: "Right now, reports are sent by hand within 24 hours. Yes, actually by hand. When volume grows, we automate. You get the same result either way.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {faqs.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={i} className="border border-gray-100 rounded-lg bg-white">
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
              aria-expanded={open}
            >
              <span className="text-sm font-medium text-gray-900">
                {item.q}
              </span>
              <span
                className={`text-gray-400 text-lg transition-transform shrink-0 ${
                  open ? "rotate-45" : ""
                }`}
                aria-hidden
              >
                +
              </span>
            </button>
            {open && (
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
