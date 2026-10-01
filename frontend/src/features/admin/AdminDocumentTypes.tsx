import { useEffect, useState } from "react";
import {
  getAdminDocumentTypes,
  getAdminDocumentTypeJSON,
  type AdminDocumentType,
} from "./api";

interface AdminDocumentTypesProps {
  onBack: () => void;
}

export function AdminDocumentTypes({
  onBack,
}: AdminDocumentTypesProps) {
  const [documentTypes, setDocumentTypes] = useState<
    AdminDocumentType[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );

  const [exportingId, setExportingId] = useState<
    number | null
  >(null);

  useEffect(() => {
    async function loadDocumentTypes() {
      try {
        setLoading(true);
        setError(null);

        const data = await getAdminDocumentTypes();

        setDocumentTypes(data);
      } catch (error) {
        console.error(
          "Failed to load document types:",
          error
        );

        setError(
          "Failed to load document types."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDocumentTypes();
  }, []);

  async function handleExport(
    documentType: AdminDocumentType
  ) {
    try {
      setExportingId(documentType.id);

      const data =
        await getAdminDocumentTypeJSON(
          documentType.id
        );

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        {
          type: "application/json",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download = `${documentType.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")}_combined.json`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Failed to export combined JSON:",
        error
      );

      alert(
        "Failed to export combined JSON."
      );
    } finally {
      setExportingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Loading document types...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          ← Back to dashboard
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800">
            Error
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          ← Back to dashboard
        </button>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Document Types
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Export combined JSON data for completed documents
          of each document type.
        </p>
      </div>

      {/* Document types */}
      {documentTypes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">
            No document types found.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documentTypes.map(
            (documentType) => (
              <div
                key={documentType.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {documentType.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {documentType.domain}
                    </p>

                    {documentType.description && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        {documentType.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() =>
                      handleExport(
                        documentType
                      )
                    }
                    disabled={
                      exportingId ===
                      documentType.id
                    }
                    className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {exportingId ===
                    documentType.id
                      ? "Exporting..."
                      : "Get Combined JSON"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}