import { useEffect, useState } from "react";
import {
  getAdminDocumentTypes,
  getAdminDocumentTypeJSON,
  type AdminDocumentType,
} from "./api";
import { publishDocumentTypeVersion } from "../document-types/api";

interface AdminDocumentTypesProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
}

export function AdminDocumentTypes({
  onBack,
  onNavigate,
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
  const [jsonViewer, setJsonViewer] = useState<{ title: string; documentTypeId: number; data: unknown } | null>(null);
  const [jsonVersion, setJsonVersion] = useState("all");
  const [copyMessage, setCopyMessage] = useState("");
  const [publishingVersionId, setPublishingVersionId] = useState<number | null>(null);
  const [publishError, setPublishError] = useState("");

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

      setJsonViewer({ title: documentType.name, documentTypeId: documentType.id, data });
      setJsonVersion("all");
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

  async function showVersion(versionNumber: number | null) {
    if (!jsonViewer) return;
    try {
      setJsonVersion(versionNumber === null ? "all" : String(versionNumber));
      const data = await getAdminDocumentTypeJSON(jsonViewer.documentTypeId, versionNumber ?? undefined);
      setJsonViewer({ ...jsonViewer, data });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load JSON version.");
    }
  }

  async function publishVersion(documentTypeId: number, versionId: number) {
    try {
      setPublishError("");
      setPublishingVersionId(versionId);
      await publishDocumentTypeVersion(documentTypeId, versionId);
      setDocumentTypes(await getAdminDocumentTypes());
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Failed to publish template version.");
    } finally {
      setPublishingVersionId(null);
    }
  }

  async function copyJSON() {
    if (!jsonViewer) return;
    await navigator.clipboard.writeText(JSON.stringify(jsonViewer.data, null, 2));
    setCopyMessage("Copied");
    window.setTimeout(() => setCopyMessage(""), 1800);
  }

  function downloadJSON() {
    if (!jsonViewer) return;
    const blob = new Blob([JSON.stringify(jsonViewer.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${jsonViewer.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}_combined.json`;
    link.click();
    URL.revokeObjectURL(url);
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
      {publishError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {publishError}
        </p>
      )}
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
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      Active version: {documentType.activeVersion ? `v${documentType.activeVersion.versionNumber}` : "None"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {documentType.versions.map((version) => (
                        <span key={version.id} className={`rounded-full px-2.5 py-1 text-xs font-medium ${version.status === "ACTIVE" ? "bg-green-100 text-green-800" : version.status === "DRAFT" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                          v{version.versionNumber} · {version.status.toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => onNavigate("templates")}
                    className="mr-3 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                  >
                    Edit fields / publish
                  </button>
                  {documentType.versions.filter((version) => version.status === "DRAFT").map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => void publishVersion(documentType.id, version.id)}
                      disabled={publishingVersionId !== null}
                      className="mr-3 mt-2 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      {publishingVersionId === version.id ? "Publishing…" : `Publish v${version.versionNumber}`}
                    </button>
                  ))}
                  {documentType.versions.filter((version) => version.status === "ARCHIVED").map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => void publishVersion(documentType.id, version.id)}
                      disabled={publishingVersionId !== null}
                      className="mr-3 mt-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      {publishingVersionId === version.id ? "Activating…" : `Activate v${version.versionNumber}`}
                    </button>
                  ))}
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
      {jsonViewer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={`${jsonViewer.title} combined JSON`}>
        <section className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div><h2 className="text-lg font-semibold text-slate-900">{jsonViewer.title} · Combined JSON</h2><p className="text-sm text-slate-500">Review the formatted export before downloading.</p></div>
            <div className="flex items-center gap-2">
              <select aria-label="JSON version" className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={jsonVersion} onChange={(event) => void showVersion(event.target.value === "all" ? null : Number(event.target.value))}>
                <option value="all">All versions</option>
                {documentTypes.find((type) => type.id === jsonViewer.documentTypeId)?.versions.map((version) => <option key={version.id} value={version.versionNumber}>Version {version.versionNumber}</option>)}
              </select>
              <button type="button" onClick={() => void copyJSON()} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">{copyMessage || "Copy JSON"}</button>
              <button type="button" onClick={downloadJSON} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Download JSON</button>
              <button type="button" aria-label="Close JSON viewer" onClick={() => setJsonViewer(null)} className="rounded-md px-3 py-2 text-slate-500 hover:bg-slate-100">✕</button>
            </div>
          </header>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words bg-slate-50 p-5 font-mono text-xs leading-5 text-slate-800">{JSON.stringify(jsonViewer.data, null, 2)}</pre>
        </section>
      </div>}
    </div>
  );
}
