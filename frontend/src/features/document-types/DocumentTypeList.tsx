import { useEffect, useMemo, useState } from "react";

import {
  getDocumentTypes,
  type DocumentType,
} from "./api";

interface DocumentTypeListProps {
  onEdit: (documentType: DocumentType) => void;
  onDelete: (documentType: DocumentType) => void;
}

export function DocumentTypeList({
  onEdit,
  onDelete,
}: DocumentTypeListProps) {
  const [documentTypes, setDocumentTypes] =
    useState<DocumentType[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchQuery, setSearchQuery] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDocumentTypes() {
      try {
        setLoading(true);
        setError("");

        const types =
          await getDocumentTypes();

        if (!cancelled) {
          setDocumentTypes(types);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load templates."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDocumentTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDocumentTypes = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    if (!query) {
      return documentTypes;
    }

    return documentTypes.filter(
      (documentType) =>
        documentType.name
          .toLowerCase()
          .includes(query) ||
        documentType.domain
          .toLowerCase()
          .includes(query) ||
        documentType.description
          ?.toLowerCase()
          .includes(query)
    );
  }, [documentTypes, searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />

          Loading templates...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-900">
          Templates
        </h2>

        <p
          role="alert"
          className="mt-2 text-sm text-red-700"
        >
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
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
            Configuration
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Document Templates
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage the document types and JSON
            structures used when processing documents.
          </p>
        </div>

        {/* Search */}
        {documentTypes.length > 0 && (
          <div className="relative w-full lg:max-w-md">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-3.5-3.5" />
            </svg>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search templates..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-20 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() =>
                  setSearchQuery("")
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 transition hover:text-slate-900"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Count */}
      {documentTypes.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {searchQuery.trim()
              ? `Showing ${filteredDocumentTypes.length} of ${documentTypes.length} templates`
              : `${documentTypes.length} ${
                  documentTypes.length === 1
                    ? "template"
                    : "templates"
                }`}
          </p>

          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() =>
                setSearchQuery("")
              }
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* No templates */}
      {documentTypes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
            📋
          </div>

          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            No templates yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Create a document template to define
            the fields and JSON structure used by
            your application.
          </p>
        </div>
      )}

      {/* No search results */}
      {documentTypes.length > 0 &&
        filteredDocumentTypes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-6 w-6 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>

            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              No templates found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              No template matches{" "}
              <span className="font-medium text-slate-700">
                "{searchQuery}"
              </span>
              .
            </p>

            <button
              type="button"
              onClick={() =>
                setSearchQuery("")
              }
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Clear Search
            </button>
          </div>
        )}

      {/* Template cards */}
      {filteredDocumentTypes.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDocumentTypes.map(
            (documentType) => (
              <article
                key={documentType.id}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                {/* Card header */}
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                    📋
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-900">
                      {documentType.name}
                    </h3>

                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {documentType.domain}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-5 flex-1">
                  <p className="text-sm leading-6 text-slate-500">
                    {documentType.description ||
                      "No description provided for this template."}
                  </p>
                </div>

                {/* Template ID */}
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Template ID
                  </p>

                  <p className="mt-1 font-mono text-sm text-slate-600">
                    #{documentType.id}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onEdit(documentType)
                    }
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDelete(documentType)
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}