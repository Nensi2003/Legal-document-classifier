import { useEffect, useMemo, useState } from "react";
import {
  getAdminDocuments,
  type AdminDocument,
} from "./api";

interface AdminDocumentsProps {
  onNavigate: (page: string) => void;
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

  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

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

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      );
    });
  }, [
    documents,
    search,
    statusFilter,
    typeFilter,
  ]);

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Documents
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View all documents uploaded by users.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("admin-dashboard")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Documents table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Toolbar */}
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">

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
            <div className="flex flex-col gap-3 lg:flex-row">

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search documents..."
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
              />

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="ALL">
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
                  setTypeFilter(
                    event.target.value
                  )
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

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">

                {filteredDocuments.map(
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
                          {document.userEmail}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(
                          document.createdAt
                        ).toLocaleDateString()}
                      </td>

                    </tr>
                  )
                )}

              </tbody>
            </table>

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