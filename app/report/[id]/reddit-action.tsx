"use client";

import type { ActionMeta } from "@/lib/audit-store";
import { redditHomeUrl, redditSubmitUrl } from "@/lib/action-plan";
import {
  Checklist,
  CopyButton,
  ExternalLinkButton,
} from "./action-shared";

export function RedditAction({
  meta,
  brandName,
  storageKey,
}: {
  meta: ActionMeta;
  brandName: string;
  storageKey: string;
}) {
  const subreddit = meta.subreddit ?? "";
  const drafts = meta.postDrafts ?? [];

  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <div className="flex flex-wrap gap-2">
        <ExternalLinkButton href={redditHomeUrl(subreddit)} primary>
          Open r/{subreddit}
        </ExternalLinkButton>
        <ExternalLinkButton href={redditSubmitUrl(subreddit)}>
          Compose a post
        </ExternalLinkButton>
      </div>

      {drafts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Post drafts (natural, non-salesy)
          </p>
          {drafts.map((d, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-md p-3 bg-gray-50 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-800 flex-1">
                  {d.title}
                </p>
                <CopyButton
                  text={`${d.title}\n\n${d.body}`}
                  label="Copy post"
                />
              </div>
              <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                {d.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <Checklist
        storageKey={storageKey}
        items={[
          `Read r/${subreddit} rules and pinned threads`,
          "Post draft #1 and reply to every comment within 24h",
          "Wait 5-7 days before posting draft #2",
          `Mention ${brandName} organically only if relevant to the thread`,
        ]}
      />
    </div>
  );
}
