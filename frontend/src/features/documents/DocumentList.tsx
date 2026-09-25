import { useEffect, useMemo, useState } from "react";

import {
  deleteDocument,
  getDocuments,
  type Document,
} from "./api";

import {
  getDocumentTypes,
  type DocumentType,
} from "../document-types/api";

interface DocumentListProps {
  onOpenDocument: (documentId: number) => void;
}

const DOCUMENTS_PER_PAGE = 10;

export function DocumentList({
  onOpenDocument,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocumentType, setSelectedDocumentType] =
    useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  /*
   * ---------------------------------------------------------
   * Load documents and document types
   * ---------------------------------------------------------
   */
  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const [documentsResult, documentTypesResult] =
        await Promise.all([
          getDocuments(),
          getDocumentTypes(),
        ]);

      setDocuments(documentsResult);
      setDocumentTypes(documentTypesResult);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load documents."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * Initial load
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [documentsResult, documentTypesResult] =
          await Promise.all([
            getDocuments(),
            getDocumentTypes(),
          ]);

        if (!cancelled) {
          setDocuments(documentsResult);
          setDocumentTypes(documentTypesResult);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load documents."
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

  /*
   * ---------------------------------------------------------
   * Delete document
   * ---------------------------------------------------------
   */
  async function handleDeleteDocument(
    documentId: number
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDocument(documentId);

      setDocuments((currentDocuments) =>
        currentDocuments.filter(
          (document) => document.id !== documentId
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete document."
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * Filter + sort documents
   *
   * Order:
   * 1. Search by filename
   * 2. Filter by document type
   * 3. Filter by status
   * 4. Sort newest uploaded first
   * ---------------------------------------------------------
   */
  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return documents
      .filter((document) => {
        /*
         * Search by filename
         */
        if (
          query &&
          !document.fileName
            .toLowerCase()
            .includes(query)
        ) {
          return false;
        }

        /*
         * Filter by document type
         */
        if (
          selectedDocumentType &&
          String(document.documentTypeId ?? "") !==
            selectedDocumentType
        ) {
          return false;
        }

        /*
         * Filter by status
         */
        if (
          selectedStatus &&
          document.status !== selectedStatus
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [
    documents,
    searchQuery,
    selectedDocumentType,
    selectedStatus,
  ]);

  /*
   * ---------------------------------------------------------
   * Pagination
   * ---------------------------------------------------------
   */
  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredDocuments.length / DOCUMENTS_PER_PAGE
    )
  );

  /*
   * Make sure the page number is always valid.
   *
   * Example:
   * If the user is on page 3 and filtering leaves only
   * 2 pages, we use page 2 instead.
   */
  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedDocuments = useMemo(() => {
    const startIndex =
      (safeCurrentPage - 1) * DOCUMENTS_PER_PAGE;

    return filteredDocuments.slice(
      startIndex,
      startIndex + DOCUMENTS_PER_PAGE
    );
  }, [
    filteredDocuments,
    safeCurrentPage,
  ]);

  /*
   * ---------------------------------------------------------
   * Display information
   * ---------------------------------------------------------
   */
  const hasFilters =
    searchQuery.trim() !== "" ||
    selectedDocumentType !== "" ||
    selectedStatus !== "";

  const firstDisplayedDocument =
    filteredDocuments.length === 0
      ? 0
      : (safeCurrentPage - 1) *
          DOCUMENTS_PER_PAGE +
        1;

  const lastDisplayedDocument = Math.min(
    safeCurrentPage * DOCUMENTS_PER_PAGE,
    filteredDocuments.length
  );

  /*
   * ---------------------------------------------------------
   * Clear filters
   * ---------------------------------------------------------
   */
  function clearFilters() {
    setSearchQuery("");
    setSelectedDocumentType("");
    setSelectedStatus("");
    setCurrentPage(1);
  }

  /*
   * ---------------------------------------------------------
   * Loading
   * ---------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Loading documents...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * Error
   * ---------------------------------------------------------
   */
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-900">
          My Documents
        </h2>

        <p
          role="alert"
          className="mt-2 text-sm text-red-700"
        >
          {error}
        </p>

        <button
          type="button"
          onClick={loadDocuments}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * Main UI
   * ---------------------------------------------------------
   */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            My Documents
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View, edit and manage your uploaded documents.
          </p>
        </div>

        <div className="rounded-lg bg-slate-100 px-3 py-2">
          <span className="text-sm font-medium text-slate-600">
            {documents.length}{" "}
            {documents.length === 1
              ? "document"
              : "documents"}
          </span>
        </div>
      </div>

      {/* Search and filters */}
      {documents.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]">

            {/* Search */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(
                    event.target.value
                  );
                  setCurrentPage(1);
                }}
                placeholder="Search documents by file name..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {/* Document type filter */}
            <select
              value={selectedDocumentType}
              onChange={(event) => {
                setSelectedDocumentType(
                  event.target.value
                );
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            >
              <option value="">
                All document types
              </option>

              {documentTypes.map((type) => (
                <option
                  key={type.id}
                  value={String(type.id)}
                >
                  {type.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
<select
  value={selectedStatus}
  onChange={(event) => {
    setSelectedStatus(event.target.value);
    setCurrentPage(1);
  }}
  className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
>
  <option value="">
    All statuses
  </option>

  <option value="PENDING">
    Pending
  </option>

  <option value="DRAFT">
    Draft
  </option>

  <option value="REVIEW">
    Review
  </option>

  <option value="READY">
    Ready
  </option>

  <option value="COMPLETED">
    Completed
  </option>
</select>

            {/* Clear filters */}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Result information */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">

            <p className="text-xs text-slate-400">
              {filteredDocuments.length === 0 ? (
                "No matching documents"
              ) : (
                <>
                  Showing{" "}
                  <span className="font-semibold text-slate-600">
                    {firstDisplayedDocument}
                  </span>
                  {"–"}
                  <span className="font-semibold text-slate-600">
                    {lastDisplayedDocument}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-600">
                    {filteredDocuments.length}
                  </span>{" "}
                  {filteredDocuments.length === 1
                    ? "document"
                    : "documents"}
                </>
              )}
            </p>

            {hasFilters && (
              <p className="text-xs text-slate-400">
                Filters applied
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
            📄
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            No documents yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            You haven't uploaded any documents yet.
            Upload a document to start extracting
            information and generating JSON.
          </p>
        </div>

      ) : filteredDocuments.length === 0 ? (

        /* No search/filter results */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
            🔍
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            No documents found
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            No documents match your current search
            or filters.
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Clear filters
            </button>
          )}
        </div>

      ) : (

        /* Document list */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Desktop header */}
          <div className="hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] md:items-center md:gap-4">

            <span>Document</span>
            <span>Type</span>
            <span>Status</span>
            <span>Uploaded</span>
            <span>Actions</span>

          </div>

          {/* Documents */}
          <div className="divide-y divide-slate-100">

            {paginatedDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onOpen={() =>
                  onOpenDocument(document.id)
                }
                onDelete={() =>
                  handleDeleteDocument(
                    document.id
                  )
                }
              />
            ))}

          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-slate-500">
                Page{" "}
                <span className="font-medium text-slate-700">
                  {safeCurrentPage}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {totalPages}
                </span>
              </p>

              <div className="flex items-center gap-2">

                {/* Previous */}
                <button
                  type="button"
                  disabled={
                    safeCurrentPage === 1
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) => page - 1
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                {/* Next */}
                <button
                  type="button"
                  disabled={
                    safeCurrentPage ===
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) => page + 1
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/*
 * =========================================================
 * Document Card
 * =========================================================
 */

interface DocumentCardProps {
  document: Document;
  onOpen: () => void;
  onDelete: () => void;
}

function DocumentCard({
  document,
  onOpen,
  onDelete,
}: DocumentCardProps) {
  return (
    <article className="px-5 py-5 transition hover:bg-slate-50 sm:px-6">

      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] md:items-center md:gap-4">

        {/* File */}
        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
            📄
          </div>

          <div className="min-w-0">

            <h3 className="truncate text-sm font-semibold text-slate-900">
              {document.fileName}
            </h3>

            <p className="mt-0.5 text-xs text-slate-400">
              Document #{document.id}
            </p>

          </div>
        </div>

        {/* Type */}
        <div>
          <p className="text-sm text-slate-600">
            {document.documentTypeId
              ? document.documentTypeName ??
                "Not classified"
              : "Not selected"}
          </p>
        </div>

        {/* Status */}
        <div>
          <StatusBadge
            status={document.status}
          />
        </div>

        {/* Date */}
        <div>
          <p className="text-sm text-slate-500">
            {formatDate(document.createdAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Open
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Delete
          </button>

        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
            📄
          </div>

          <div className="min-w-0 flex-1">

            <h3 className="truncate text-sm font-semibold text-slate-900">
              {document.fileName}
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Document #{document.id}
            </p>

          </div>

          <StatusBadge
            status={document.status}
          />

        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3">

          {/* Type */}
          <div>

            <p className="text-xs font-medium text-slate-400">
              Type
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {document.documentTypeId
                ? document.documentTypeName ??
                  "Not classified"
                : "Not selected"}
            </p>

          </div>

          {/* Uploaded */}
          <div>

            <p className="text-xs font-medium text-slate-400">
              Uploaded
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {formatDate(document.createdAt)}
            </p>

          </div>

        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">

          <button
            type="button"
            onClick={onOpen}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Delete
          </button>

        </div>

      </div>
    </article>
  );
}

/*
 * =========================================================
 * Status Badge
 * =========================================================
 */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const statusConfig =
    getStatusConfig(status);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.className}`}
    >
      {statusConfig.label}
    </span>
  );
}

function getStatusConfig(
  status: string
): {
  label: string;
  className: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending",
        className:
          "bg-amber-50 text-amber-700",
      };

      case "REVIEW":
  return {
    label: "Review",
    className:
      "bg-orange-50 text-orange-700",
  };

case "READY":
  return {
    label: "Ready",
    className:
      "bg-purple-50 text-purple-700",
  };

    case "DRAFT":
      return {
        label: "Draft",
        className:
          "bg-blue-50 text-blue-700",
      };

    case "COMPLETED":
      return {
        label: "Completed",
        className:
          "bg-emerald-50 text-emerald-700",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-600",
      };
  }
}

/*
 * =========================================================
 * Date formatting
 * =========================================================
 */

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}