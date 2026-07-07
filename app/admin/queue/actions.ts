"use server";

import { revalidatePath } from "next/cache";
import { markSent as storeMarkSent } from "@/lib/audit-store";

export async function markAuditAsSent(id: string) {
  await storeMarkSent(id);
  revalidatePath("/admin/queue");
}
