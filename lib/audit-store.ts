import { putJSON, getJSON, listByPrefix } from "./blob";
import type {
  BrandIntelligence,
  AuditPrompt,
} from "@/app/api/audit/analyze/route";

export type ActionType = "reddit" | "wikipedia" | "comparison" | "other";

export type ActionMeta = {
  // reddit
  subreddit?: string;
  postDrafts?: Array<{ title: string; body: string }>;
  // wikipedia
  articleTitle?: string;
  stubDraft?: string;
  suggestedSources?: string[];
  // comparison
  proposedTitle?: string;
  proposedOutline?: string[];
  targetKeywords?: string[];
};

export type Recommendation = {
  title: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  detail: string;
  // Present on audits generated after the action-plan release.
  // Optional so pre-existing audits render without action cards.
  actionType?: ActionType;
  actionMeta?: ActionMeta;
};

export type StoredAuditResult = {
  citationScore: number;
  totalPrompts: number;
  citationRate: number;
  competitorScores: Record<string, number>;
  winningBrands: Record<string, number>;
  recommendations: Recommendation[];
};

export type StoredAudit = {
  id: string;
  url: string;
  brand: BrandIntelligence;
  prompts: AuditPrompt[];
  result: StoredAuditResult;
  email: string | null;
  status: "awaiting_email" | "pending_send" | "sent";
  createdAt: string;
  sentAt: string | null;
};

function auditPath(id: string): string {
  return `audits/${id}.json`;
}

export async function createAudit(
  data: Omit<StoredAudit, "email" | "status" | "sentAt">
): Promise<void> {
  const audit: StoredAudit = {
    ...data,
    email: null,
    status: "awaiting_email",
    sentAt: null,
  };
  await putJSON(auditPath(audit.id), audit);
}

export async function getAudit(id: string): Promise<StoredAudit | null> {
  return await getJSON<StoredAudit>(auditPath(id));
}

export async function attachEmail(
  id: string,
  email: string
): Promise<StoredAudit | null> {
  const audit = await getAudit(id);
  if (!audit) return null;
  audit.email = email;
  audit.status = "pending_send";
  await putJSON(auditPath(id), audit);
  return audit;
}

export async function markSent(id: string): Promise<StoredAudit | null> {
  const audit = await getAudit(id);
  if (!audit) return null;
  audit.status = "sent";
  audit.sentAt = new Date().toISOString();
  await putJSON(auditPath(id), audit);
  return audit;
}

export async function listPendingAudits(): Promise<StoredAudit[]> {
  const blobs = await listByPrefix("audits/");
  const audits = await Promise.all(
    blobs.map(async (b) => {
      try {
        // Cache-bust: CDN can serve pre-overwrite copies otherwise.
        const bustUrl = `${b.url}${b.url.includes("?") ? "&" : "?"}_ts=${Date.now()}`;
        const res = await fetch(bustUrl, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as StoredAudit;
      } catch {
        return null;
      }
    })
  );
  return audits
    .filter((a): a is StoredAudit => a !== null)
    .filter((a) => a.status === "pending_send")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
