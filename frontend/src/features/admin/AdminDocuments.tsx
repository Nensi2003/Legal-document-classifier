import { useEffect, useMemo, useState } from "react";
import {
  deleteAdminDocument,
  getAdminDocuments,
  type AdminDocument,
} from "./api";

interface AdminDocumentsProps {
  onNavigate: (page: string) => void;
}

const DOCUMENTS_PER_PAGE = 10;

function localDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function AdminDocuments({
  onNavigate,
}: AdminDocumentsProps) {
  const [documents, setDocuments] = useState<
    AdminDocument[]
  >([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);

  async function handleDeleteDocument(document: AdminDocument) {
    if (!window.confirm(`Delete “${document.fileName}”? This cannot be undone.`)) return;

    setDeletingDocumentId(document.id);
    setDeleteError(null);
    try {
      await deleteAdminDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "Failed to delete document.");
    } finally {
      setDeletingDocumentId(null);
    }
  }

  useEffect(() => {
    async function loadDocuments() {
      try {
        setLoading(true);
        setError(null);

        const data = await getAdminDocuments();

        setDocuments(data);
      } catch (error) {
        console.error(
          "Failed to load documents:",
          error
        );

        setError(
          "Failed to load uploaded documents."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, []);

  const documentTypes = useMemo<string[]>(() => {
  return Array.from(
    new Set(
      documents
        .map(
          (document) =>
            document.documentTypeName
        )
        .filter(
          (type): type is string =>
            Boolean(type)
        )
    )
  ).sort();
}, [documents]);

  const uploaderOptions = useMemo(() => {
    const byId = new Map<number, { id: number; name: string; email: string }>();
    for (const document of documents) {
      byId.set(document.userId, {
        id: document.userId,
        name: document.userName || "Unnamed user",
        email: document.userEmail || "",
      });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const searchTerm = search
      .toLowerCase()
      .trim();

    return documents.filter((document) => {
      const matchesSearch =
  !searchTerm ||
  document.fileName.toLowerCase().includes(searchTerm) ||
  (document.userName?.toLowerCase().includes(searchTerm) ?? false) ||
  (document.userEmail?.toLowerCase().includes(searchTerm) ?? false) ||
  (document.documentTypeName?.toLowerCase().includes(searchTerm) ?? false);

      const matchesStatus =
        statusFilter === "ALL" ||
        document.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" ||
        document.documentTypeName === typeFilter;

      const matchesUser = userFilter === "ALL" || String(document.userId) === userFilter;
      const uploadDate = localDateKey(document.createdAt);
      const matchesDate = (!fromDate || uploadDate >= fromDate) && (!toDate || uploadDate <= toDate);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesUser &&
        matchesDate
      );
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id);
  }, [
    documents,
    search,
    statusFilter,
    typeFilter,
    userFilter,
    fromDate,
    toDate,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedDocuments = filteredDocuments.slice(
    (safeCurrentPage - 1) * DOCUMENTS_PER_PAGE,
    safeCurrentPage * DOCUMENTS_PER_PAGE,
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading documents...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <h2 className="font-semibold text-red-800 dark:text-red-400">
          Error
        </h2>

        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Documents
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View document uploads and publication status. Users process documents published here.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNavigate("upload")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Publish document
        </button>
        <button type="button" onClick={() => onNavigate("batch-upload")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Publish batch</button>

        <button
          type="button"
          onClick={() => onNavigate("admin-dashboard")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ← Back to Dashboard
        </button>
        </div>
      </div>

      {/* Documents table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Toolbar */}
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">

          {deleteError && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {deleteError}
            </div>
          )}

          <div className="flex flex-col gap-4">

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Uploaded Documents
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredDocuments.length} of{" "}
                {documents.length} document
                {documents.length !== 1
                  ? "s"
                  : ""}{" "}
                in the system
              </p>
            </div>

            {/* Search + Filters */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  { setSearch(event.target.value); setCurrentPage(1); }
                }
                placeholder="Search documents..."
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
              />

              {/* Status filter */}
              <select
                aria-label="Filter documents by status"
                value={statusFilter}
                onChange={(event) =>
                  { setStatusFilter(event.target.value); setCurrentPage(1); }
                }
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="ALL">
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

              {/* Document type filter */}
              <select
                value={typeFilter}
                onChange={(event) =>
                  { setTypeFilter(event.target.value); setCurrentPage(1); }
                }
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="ALL">
                  All document types
                </option>

                {documentTypes.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>

              <select aria-label="Filter documents by uploader" value={userFilter} onChange={(event) => { setUserFilter(event.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <option value="ALL">All users</option>
                {uploaderOptions.map((uploader) => <option key={uploader.id} value={String(uploader.id)}>{uploader.name}{uploader.email ? ` · ${uploader.email}` : ""}</option>)}
              </select>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Uploaded from
                <input aria-label="Filter documents uploaded from date" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => { setFromDate(event.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                Uploaded through
                <input aria-label="Filter documents uploaded through date" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" />
              </label>

            </div>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {documents.length === 0
              ? "No documents found."
              : "No documents match your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <tr>

                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    Document
                  </th>

                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    Type
                  </th>

                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    Status
                  </th>

                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    Uploaded by
                  </th>

                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    Date
                  </th>

                  <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">

                {paginatedDocuments.map(
                  (document) => (
                    <tr
                      key={document.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >

                      {/* Document */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {document.fileName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {document.mimeType}
                        </p>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {document.documentTypeName ||
                          "Not classified"}
                        {document.documentTypeVersionNumber && (
                          <span className="ml-1 text-xs text-slate-400">v{document.documentTypeVersionNumber}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={document.status}
                        />
                      </td>

                      {/* User */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {document.userName ||
                            "Unnamed user"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {document.uploaderRole === "ADMIN" ? "Admin uploader · " : ""}{document.userEmail}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(
                          document.createdAt
                        ).toLocaleDateString()}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {document.uploaderRole !== "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument(document)}
                            disabled={deletingDocumentId === document.id}
                            aria-label={`Delete ${document.fileName}`}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            {deletingDocumentId === document.id ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>
            </table>

          </div>
        )}
        {filteredDocuments.length > DOCUMENTS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">Page {safeCurrentPage} of {totalPages} · showing {(safeCurrentPage - 1) * DOCUMENTS_PER_PAGE + 1}–{Math.min(safeCurrentPage * DOCUMENTS_PER_PAGE, filteredDocuments.length)} of {filteredDocuments.length}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">← Previous</button>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalizedStatus =
    status.toUpperCase();

  let className =
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  if (normalizedStatus === "COMPLETED") {
    className =
      "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300";
  }

  if (normalizedStatus === "PENDING") {
    className =
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300";
  }

  if (normalizedStatus === "DRAFT") {
    className =
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }

  if (normalizedStatus === "REVIEW") {
    className =
      "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300";
  }

  if (normalizedStatus === "FAILED") {
    className =
      "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}
