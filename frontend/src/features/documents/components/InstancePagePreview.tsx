import { useEffect, useState } from "react";
import { DocumentPreview } from "./DocumentPreview";

interface InstancePagePreviewProps {
  documentId: number;
  instanceId: number;
  fileName: string;
  mimeType: string;
  startPage: number;
  endPage: number;
}

export function InstancePagePreview({
  documentId,
  instanceId,
  fileName,
  mimeType,
  startPage,
  endPage,
}: InstancePagePreviewProps) {
  const [page, setPage] = useState(startPage);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => setPage(startPage), [instanceId, startPage]);

  useEffect(() => {
    if (mimeType !== "application/pdf") {
      setLoading(false);
      setImageUrl("");
      setError("");
      return;
    }

    const controller = new AbortController();
    let objectUrl = "";
    async function loadPage() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `http://localhost:3000/api/documents/${documentId}/instances/${instanceId}/preview?page=${page}`,
          { credentials: "include", signal: controller.signal },
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to render this page.");
        }
        objectUrl = URL.createObjectURL(await response.blob());
        setImageUrl(objectUrl);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setImageUrl("");
          setError(loadError instanceof Error ? loadError.message : "Failed to render this page.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadPage();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, instanceId, mimeType, page]);

  if (mimeType !== "application/pdf") {
    return <div>
      <p className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
        This file type does not support page-by-page boundary preview. Review the original file below.
      </p>
      <DocumentPreview documentId={documentId} fileName={fileName} mimeType={mimeType} />
    </div>;
  }

  return <div>
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <p className="text-sm font-medium text-slate-700">Instance pages {startPage}–{endPage}</p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">Page {page} of {endPage}</span>
        <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= startPage || loading} className="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40" aria-label="Previous instance page">Previous</button>
        <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= endPage || loading} className="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40" aria-label="Next instance page">Next</button>
      </div>
    </div>
    <div className="flex min-h-[420px] items-center justify-center bg-slate-100 p-4">
      {loading ? <p role="status" className="text-sm text-slate-500">Rendering page {page}…</p>
        : error ? <div role="alert" className="max-w-md text-center">
          <p className="text-sm text-red-700">{error}</p>
          <a href={`http://localhost:3000/api/documents/${documentId}/file`} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Open original PDF</a>
        </div>
          : <img src={imageUrl} alt={`${fileName}, page ${page}`} className="max-h-[620px] max-w-full bg-white object-contain shadow" />}
    </div>
  </div>;
}
