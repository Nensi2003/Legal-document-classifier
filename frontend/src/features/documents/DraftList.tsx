import { useEffect, useMemo, useState } from "react";

import {
    getDraftDocuments,
    type DraftDocument,
} from "./draftsApi";

interface DraftListProps {
  onSelectDraft: (documentId: number) => void;
}

export function DraftList({
  onSelectDraft,
}: DraftListProps) {
const [drafts, setDrafts] = useState<DraftDocument[]>([]);  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadDrafts() {
    try {
      setLoading(true);
      setError("");

      const data = await getDraftDocuments();

      setDrafts(data);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load drafts."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getDraftDocuments();

        if (!cancelled) {
          setDrafts(data);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load drafts."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDrafts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return drafts;
    }

    return drafts.filter((draft) =>
      draft.fileName
        .toLowerCase()
        .includes(query)
    );
  }, [drafts, searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
          Loading drafts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-900">
          My Drafts
        </h2>

        <p
          role="alert"
          className="mt-2 text-sm text-red-700"
        >
          {error}
        </p>

        <button
          type="button"
          onClick={loadDrafts}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            My Drafts
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Continue working on documents you haven't
            completed yet.
          </p>
        </div>

        {/* Search */}
        {drafts.length > 0 && (
          <div className="relative w-full lg:max-w-md">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search drafts by file name..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-20 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 transition hover:text-slate-900"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Count */}
      {drafts.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {searchQuery.trim()
              ? `Showing ${filteredDrafts.length} of ${drafts.length} drafts`
              : `${drafts.length} ${
                  drafts.length === 1
                    ? "draft"
                    : "drafts"
                }`}
          </p>

          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* No drafts */}
      {drafts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
            📝
          </div>

          <h2 className="mt-4 text-sm font-semibold text-slate-800">
            No drafts yet
          </h2>

          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Documents that you start editing will appear
            here automatically.
          </p>
        </div>
      )}

      {/* No search results */}
      {drafts.length > 0 &&
        filteredDrafts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <svg
                className="h-5 w-5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>

            <h2 className="mt-4 text-sm font-semibold text-slate-800">
              No drafts found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              No draft matches "{searchQuery}".
            </p>

            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Clear Search
            </button>
          </div>
        )}

      {/* Draft cards */}
      {filteredDrafts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDrafts.map((draft) => (
            <article
              key={draft.id}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              {/* Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg">
                    📝
                  </div>

                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold text-slate-800"
                      title={draft.fileName}
                    >
                      {draft.fileName}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
  Document #{draft.id}
</p>
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  Draft
                </span>
              </div>

              {/* Info */}
              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Document status
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  Continue editing this document
                </p>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={() =>
                  onSelectDraft(draft.id)
                }
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Continue editing
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

