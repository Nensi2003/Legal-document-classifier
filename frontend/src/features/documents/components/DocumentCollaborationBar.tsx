import { useEffect, useState } from "react";
import { realtimeClient } from "../../realtime/realtimeClient";
import type { ActiveDocumentWorker, RealtimeEvent } from "../../realtime/protocol";

export function DocumentCollaborationBar({ documentId, userId }: { documentId: number; userId: number }) {
  const [workers, setWorkers] = useState<ActiveDocumentWorker[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => realtimeClient.onEvent((event: RealtimeEvent) => {
    if (event.documentId !== documentId) return;
    if (event.type === "DOCUMENT_PRESENCE" && Array.isArray(event.payload.users)) {
      setWorkers(event.payload.users as ActiveDocumentWorker[]);
      return;
    }
    if (event.type === "DOCUMENT_CLAIMED") {
      setWorkers((current) => current.some((worker) => worker.userId === event.userId)
        ? current : [...current, { userId: event.userId ?? 0, userName: String(event.payload.userName ?? "Another user") }]);
    }
    if (event.type === "DOCUMENT_RELEASED") setWorkers((current) => current.filter((worker) => worker.userId !== event.userId));
    if (event.userId && event.userId !== userId && ["DOCUMENT_UPDATED", "DOCUMENT_STATUS_CHANGED", "DOCUMENT_JSON_UPDATED", "DOCUMENT_COMPLETED"].includes(event.type)) {
      const description = event.type === "DOCUMENT_COMPLETED" ? "Another user completed this document." : event.type === "DOCUMENT_JSON_UPDATED" ? "Another user generated updated JSON." : event.type === "DOCUMENT_STATUS_CHANGED" ? `Document status changed to ${String(event.payload.status ?? "updated")}.` : "Another user updated this document.";
      setNotice(description);
      window.setTimeout(() => setNotice(""), 5000);
    }
  }), [documentId, userId]);

  const others = workers.filter((worker) => worker.userId !== userId);
  return <aside className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm" aria-live="polite">
    <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold ${others.length ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${others.length ? "bg-red-500" : "bg-green-500"}`} />
      {others.length ? `Currently working: ${others.map((worker) => worker.userName || "User").join(", ")}` : "You are working on this document"}
    </p>
    {notice && <p className="rounded-md bg-sky-50 px-3 py-1.5 font-medium text-sky-700">{notice}</p>}
  </aside>;
}
