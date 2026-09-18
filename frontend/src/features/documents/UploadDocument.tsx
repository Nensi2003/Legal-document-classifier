import { useState } from "react";
import { uploadDocument } from "./api";

interface UploadDocumentProps {
  onUploaded: (documentId: number) => void;
  onCancel: () => void;
}

export function UploadDocument({
  onUploaded,
  onCancel,
}: UploadDocumentProps) {
  const [file, setFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setError("");
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a document.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const document =
        await uploadDocument(file);

      onUploaded(document.id);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload document."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Upload Document
        </h1>

        <p className="mt-2 text-slate-500">
          Upload a document to extract its content and
          convert it into structured JSON.
        </p>
      </div>

      {/* Upload card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Select a document
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Supported formats: PDF, Word, CSV, JPG and PNG.
          </p>
        </div>

        {/* File picker */}
        <label
          htmlFor="document-upload"
          className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
            uploading
              ? "cursor-not-allowed border-slate-200 bg-slate-50"
              : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
          }`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
            ↑
          </div>

          <p className="text-sm font-semibold text-slate-900">
            {file
              ? "Document selected"
              : "Click to select a document"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            PDF, DOC, DOCX, CSV, JPG or PNG
          </p>

          <input
            id="document-upload"
            type="file"
            accept=".pdf,.doc,.docx,.csv,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {/* Selected file */}
        {file && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Selected file
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(file.size)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setError("");
              }}
              disabled={uploading}
              className="ml-4 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Uploading...
              </span>
            ) : (
              "Upload Document"
            )}
          </button>
        </div>
      </section>

      {/* Information */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm">
            i
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              What happens next?
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Your document will be uploaded and its content
              will be extracted. You can then select the
              appropriate document type and complete the
              structured information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(
  bytes: number
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}