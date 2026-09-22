import { useEffect, useState } from "react";

import {
  getBatches,
  type BatchListItem,
} from "./batchApi";

interface BatchListProps {
  onOpenBatch: (batchId: number) => void;
}

export function BatchList({
  onOpenBatch,
}: BatchListProps) {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBatches() {
      try {
        setLoading(true);
        setError("");

        const result = await getBatches();

        setBatches(result.batches);
      } catch (error) {
        console.error("Failed to load batches:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load batches."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBatches();
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "ACTIVE":
        return "Active";

      case "COMPLETED":
        return "Completed";

      default:
        return status;
    }
  }

  function getStatusClasses(status: string) {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700";

      case "COMPLETED":
        return "bg-slate-100 text-slate-600";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Loading batches...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Batch List
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View and manage your previous document batches.
        </p>
      </div>

      {/* Empty state */}
      {batches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-2xl">
            📁
          </div>

          <h2 className="mt-4 text-base font-semibold text-slate-800">
            No batches yet
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Upload your first batch of documents to see it here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Table header */}
          <div className="hidden grid-cols-[1fr_180px_120px_100px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <span>Batch</span>
            <span>Created</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {/* Batches */}
          <div className="divide-y divide-slate-100">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_180px_120px_100px] md:items-center"
              >
                {/* Batch */}
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Batch #{batch.id}
                  </p>

                  <p className="mt-1 text-xs text-slate-400 md:hidden">
                    {formatDate(batch.createdAt)}
                  </p>
                </div>

                {/* Created */}
                <p className="hidden text-sm text-slate-500 md:block">
                  {formatDate(batch.createdAt)}
                </p>

                {/* Status */}
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                      batch.status
                    )}`}
                  >
                    {getStatusLabel(batch.status)}
                  </span>
                </div>

                {/* Action */}
                <div className="md:text-right">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenBatch(batch.id)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}