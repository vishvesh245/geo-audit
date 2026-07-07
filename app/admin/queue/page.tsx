import { listPendingAudits } from "@/lib/audit-store";
import { renderReport } from "@/lib/report-template";
import QueueList from "./queue-list";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const audits = await listPendingAudits();

  const items = audits.map((audit) => ({
    audit,
    report: renderReport(audit),
  }));

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {audits.length} audit{audits.length === 1 ? "" : "s"} awaiting
            email dispatch
          </p>
        </header>

        {audits.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500">
              No pending audits. Nice work.
            </p>
          </div>
        ) : (
          <QueueList items={items} />
        )}
      </div>
    </main>
  );
}
