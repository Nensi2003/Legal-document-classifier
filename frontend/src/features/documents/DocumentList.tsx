import { useEffect, useMemo, useState } from "react";

import {
  deleteDocument,
  getDocuments,
  type Document,
} from "./api";
import { realtimeClient } from "../realtime/realtimeClient";

import {
  getDocumentTypes,
  type DocumentType,
} from "../document-types/api";

interface DocumentListProps {
  onOpenDocument: (documentId: number) => void;
}

const DOCUMENTS_PER_PAGE = 10;

function localDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  const [selectedUploader, setSelectedUploader] = useState("");
  const [selectedScope, setSelectedScope] = useState<"ALL" | "OWN" | "AVAILABLE">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  useEffect(() => {
    const releases = documents.map((document) => realtimeClient.watchDocument(document.id));
    return () => releases.forEach((release) => release());
  }, [documents]);

  useEffect(() => {
    let refreshTimer = 0;
    const refreshFromServer = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void Promise.all([getDocuments(), getDocumentTypes()]).then(([nextDocuments, nextTypes]) => {
          setDocuments(nextDocuments);
          setDocumentTypes(nextTypes);
        }).catch((loadError) => console.error("Failed to refresh documents after a live update:", loadError));
      }, 150);
    };
    const unsubscribe = realtimeClient.onEvent((event) => {
      if (["CONNECTED", "DOCUMENT_AVAILABLE", "DOCUMENT_UPDATED", "DOCUMENT_STATUS_CHANGED", "DOCUMENT_COMPLETED", "DOCUMENT_DELETED", "DOCUMENT_CLAIMED", "DOCUMENT_RELEASED"].includes(event.type)) refreshFromServer();
    });
    return () => {
      unsubscribe();
      if (refreshTimer) window.clearTimeout(refreshTimer);
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
        if (selectedScope === "OWN" && !document.isUploadedByCurrentUser) return false;
        if (selectedScope === "AVAILABLE" && !document.isAvailableToUser) return false;
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
        if (selectedUploader && String(document.uploaderId ?? "") !== selectedUploader) return false;

        const uploadDate = localDateKey(document.createdAt);
        if ((fromDate && uploadDate < fromDate) || (toDate && uploadDate > toDate)) return false;

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime() || b.id - a.id
      );
  }, [
    documents,
    searchQuery,
    selectedDocumentType,
    selectedStatus,
    selectedUploader,
    selectedScope,
    fromDate,
    toDate,
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
    selectedStatus !== "" ||
    selectedUploader !== "" ||
    selectedScope !== "ALL" ||
    fromDate !== "" ||
    toDate !== "";

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
    setSelectedUploader("");
    setSelectedScope("ALL");
    setFromDate("");
    setToDate("");
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
            Documents
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Work on your uploads or documents published by administrators.
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
      <div className="flex flex-wrap gap-2" aria-label="Document collections">
        {(["ALL", "OWN", "AVAILABLE"] as const).map((scope) => {
          const count = scope === "ALL" ? documents.length : documents.filter((document) => scope === "OWN" ? document.isUploadedByCurrentUser : document.isAvailableToUser).length;
          const label = scope === "ALL" ? "All documents" : scope === "OWN" ? "My uploads" : "Available Documents";
          return <button key={scope} type="button" aria-pressed={selectedScope === scope} onClick={() => { setSelectedScope(scope); setCurrentPage(1); }} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${selectedScope === scope ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            {label} <span className={selectedScope === scope ? "text-slate-300" : "text-slate-400"}>({count})</span>
          </button>;
        })}
      </div>

      {documents.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

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

            <select aria-label="Filter documents by uploader" value={selectedUploader} onChange={(event) => { setSelectedUploader(event.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200">
              <option value="">All uploaders</option>
              {[...new Map(documents.filter((document) => document.uploaderId != null).map((document) => [document.uploaderId, document.uploaderRole === "ADMIN" ? "Admin" : document.uploaderName || "Unknown uploader"])).entries()].map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
            </select>

            {/* Status filter */}
<select
  aria-label="Filter documents by status"
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

  <option value="AVAILABLE">
    Available
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

  <option value="FAILED">
    Failed
  </option>
</select>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Uploaded from
              <input aria-label="Filter documents uploaded from date" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => { setFromDate(event.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Uploaded through
              <input aria-label="Filter documents uploaded through date" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" />
            </label>

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

            {hasFilters && <div className="flex flex-wrap gap-1.5 text-xs">{selectedStatus && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Status: {selectedStatus}</span>}{selectedDocumentType && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Type: {documentTypes.find((type) => String(type.id) === selectedDocumentType)?.name}</span>}{selectedUploader && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Uploaded by: {documents.find((document) => String(document.uploaderId) === selectedUploader)?.uploaderRole === "ADMIN" ? "Admin" : documents.find((document) => String(document.uploaderId) === selectedUploader)?.uploaderName}</span>}</div>}
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
          <div className="hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto] md:items-center md:gap-4">

            <span>Document</span>
            <span>Type</span>
            <span>Uploaded By</span>
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
  const activelyClaimed = Boolean(document.activeWorkerId != null && document.claimExpiresAt && new Date(document.claimExpiresAt).getTime() > Date.now());
  const availableForWork = !activelyClaimed && document.status !== "COMPLETED" && (document.status === "AVAILABLE" || (document.isAvailableToUser && ["DRAFT", "READY"].includes(document.status)));
  return (
    <article className={`px-5 py-5 transition sm:px-6 ${availableForWork ? "bg-emerald-50/60 hover:bg-emerald-50" : document.status !== "COMPLETED" && activelyClaimed ? "bg-rose-50/60 hover:bg-rose-50" : "hover:bg-slate-50"}`}>

      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto] md:items-center md:gap-4">

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
            {document.status !== "COMPLETED" && activelyClaimed && <p className="mt-1 text-xs font-semibold text-rose-700">Currently working: {document.activeWorkerName || "User"}</p>}

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
          <p className="text-sm text-slate-600">{document.uploaderRole === "ADMIN" ? "Admin" : document.uploaderName || "Unknown"}</p>
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

          {document.isUploadedByCurrentUser && document.uploaderRole !== "ADMIN" && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${document.fileName}`}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </button>
          )}

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
            <p className="mt-1 text-xs font-medium text-slate-500">Uploaded by: {document.uploaderRole === "ADMIN" ? "Admin" : document.uploaderName || "Unknown"}</p>
            {document.status !== "COMPLETED" && activelyClaimed && <p className="mt-1 text-xs font-semibold text-rose-700">Currently working: {document.activeWorkerName || "User"}</p>}

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

          {document.isUploadedByCurrentUser && document.uploaderRole !== "ADMIN" && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${document.fileName}`}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </button>
          )}

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
    case "AVAILABLE":
      return { label: "Available", className: "bg-blue-50 text-blue-700" };
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
