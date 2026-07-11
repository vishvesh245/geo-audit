"use client";

import type { ActionMeta } from "@/lib/audit-store";
import { docsNewUrl, notionNewUrl } from "@/lib/action-plan";
import {
  Checklist,
  CopyButton,
  ExternalLinkButton,
} from "./action-shared";

export function ComparisonAction({
  meta,
  brandName,
  storageKey,
}: {
  meta: ActionMeta;
  brandName: string;
  storageKey: string;
}) {
  const title = meta.proposedTitle ?? `${brandName} comparison`;
  const outline = meta.proposedOutline ?? [];
  const keywords = meta.targetKeywords ?? [];

  const fullDraft = [
    `# ${title}`,
    "",
    ...outline.map((h) => `${h.startsWith("#") ? h : `## ${h}`}\n\n[Write 150-250 words here]`),
    "",
    keywords.length ? `<!-- Target keywords: ${keywords.join(", ")} -->` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <div className="flex flex-wrap gap-2">
        <ExternalLinkButton href={docsNewUrl()} primary>
          New Google Doc
        </ExternalLinkButton>
        <ExternalLinkButton href={notionNewUrl()}>
          New Notion page
        </ExternalLinkButton>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Proposed title
          </p>
          <CopyButton text={title} label="Copy title" />
        </div>
        <p className="text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
          {title}
        </p>
      </div>

      {outline.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Article outline
            </p>
            <CopyButton text={fullDraft} label="Copy outline" />
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            {outline.map((h, i) => (
              <li
                key={i}
                className="border-l-2 border-blue-200 pl-3 py-0.5 font-medium"
              >
                {h.replace(/^#+\s*/, "")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Target keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k, i) => (
              <span
                key={i}
                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      <Checklist
        storageKey={storageKey}
        items={[
          "Draft ~1500 words using the outline",
          "Add 3-5 product photos or screenshots",
          "Publish on your blog or Medium",
          "Cross-post to your LinkedIn and Twitter",
        ]}
      />
    </div>
  );
}
