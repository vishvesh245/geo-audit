"use client";

import type { ActionMeta } from "@/lib/audit-store";
import {
  googleScholarUrl,
  wikipediaSandboxUrl,
  wikipediaSearchUrl,
} from "@/lib/action-plan";
import {
  Checklist,
  CopyButton,
  ExternalLinkButton,
} from "./action-shared";

export function WikipediaAction({
  meta,
  brandName,
  storageKey,
}: {
  meta: ActionMeta;
  brandName: string;
  storageKey: string;
}) {
  const articleTitle = meta.articleTitle ?? brandName;
  const stubDraft = meta.stubDraft ?? "";
  const sources = meta.suggestedSources ?? [];

  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <div className="flex flex-wrap gap-2">
        <ExternalLinkButton
          href={wikipediaSearchUrl(articleTitle)}
          primary
        >
          Search Wikipedia for &quot;{articleTitle}&quot;
        </ExternalLinkButton>
        <ExternalLinkButton href={wikipediaSandboxUrl()}>
          Draft in Sandbox
        </ExternalLinkButton>
        <ExternalLinkButton
          href={googleScholarUrl(`${brandName} ${articleTitle}`)}
        >
          Find sources on Scholar
        </ExternalLinkButton>
      </div>

      {stubDraft && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Article stub (wiki markup)
            </p>
            <CopyButton text={stubDraft} label="Copy stub" />
          </div>
          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-md whitespace-pre-wrap font-mono overflow-x-auto max-h-64 overflow-y-auto">
            {stubDraft}
          </pre>
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Suggested sources (need 3+ for notability)
          </p>
          <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
            {sources.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <Checklist
        storageKey={storageKey}
        items={[
          "Verify at least 3 non-affiliated third-party sources exist",
          "Draft article in Sandbox using the stub above",
          "Submit via Articles for Creation",
          "Respond to reviewer feedback within a week",
        ]}
      />
    </div>
  );
}
