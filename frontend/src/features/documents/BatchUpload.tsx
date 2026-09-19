import { useState } from "react";

import {
    uploadBatch,
    type BatchUploadResponse,
} from "./batchApi";

interface BatchUploadProps {
  onComplete: (result: BatchUploadResponse) => void;
  onCancel: () => void;
  onOpenDocument: (documentId: number) => void;
}

export function BatchUpload({
  onComplete,
  onCancel,
  onOpenDocument,
}: BatchUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] =
    useState<BatchUploadResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(selectedFiles: File[]) {
    setError("");

    if (selectedFiles.length === 0) {
      return;
    }

    const combinedFiles = [...files, ...selectedFiles];

    if (combinedFiles.length > 100) {
      setError("You can upload a maximum of 100 files.");
      return;
    }

    setFiles(combinedFiles);
    setResult(null);
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    addFiles(Array.from(event.target.files ?? []));

    // Allow selecting the same file again later.
    event.target.value = "";
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDragging(false);

    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index)
    );
  }

  function clearFiles() {
    setFiles([]);
    setError("");
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setResult(null);

      const uploadResult = await uploadBatch(files);

      setResult(uploadResult);
      onComplete(uploadResult);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload documents."
      );
    } finally {
      setUploading(false);
    }
  }

  function handleNewBatch() {
    setFiles([]);
    setResult(null);
    setError("");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {!result ? (
        <>
          {/* Header */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-lg text-white">
                ↑
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Batch Upload
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Upload and process multiple documents at once.
                </p>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
              isDragging
                ? "border-slate-500 bg-slate-100"
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/70"
            }`}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              📄
            </div>

            <h3 className="mt-5 text-base font-semibold text-slate-800">
              Drop your documents here
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              or select multiple files from your computer
            </p>

            <label className="mt-5 inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
              Browse files
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.csv,.jpg,.jpeg,.png"
                className="hidden"
              />
            </label>

            <p className="mt-4 text-xs text-slate-400">
              PDF · DOC · DOCX · CSV · JPG · JPEG · PNG
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Maximum 100 documents per batch
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <span className="mt-0.5 text-red-500">!</span>

              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Selected files */}
          {files.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Selected documents
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {files.length} of 100 documents selected
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearFiles}
                  disabled={uploading}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    {/* File icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                      {getFileIcon(file.name)}
                    </div>

                    {/* File information */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium text-slate-800"
                        title={file.name}
                      >
                        {file.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    {/* Ready status */}
                    <span className="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500 sm:flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Ready
                    </span>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      aria-label={`Remove ${file.name}`}
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Processing state */}
          {uploading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Processing documents...
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Uploading and processing your batch. Please wait.
                  </p>
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-slate-800" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={uploading}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading
                ? "Processing..."
                : `Upload ${files.length} ${
                    files.length === 1 ? "document" : "documents"
                  }`}
            </button>
          </div>
        </>
      ) : (
        <BatchResults
          result={result}
          onOpenDocument={onOpenDocument}
          onNewBatch={handleNewBatch}
        />
      )}
    </div>
  );
}

interface BatchResultsProps {
  result: BatchUploadResponse;
  onOpenDocument: (documentId: number) => void;
  onNewBatch: () => void;
}

function BatchResults({
  result,
  onOpenDocument,
  onNewBatch,
}: BatchResultsProps) {
  return (
    <section className="space-y-6">
      {/* Results header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg">
                ✓
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Batch processing complete
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your documents have finished processing.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNewBatch}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Upload another batch
          </button>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <SummaryCard
            value={result.total}
            label="Total"
          />

          <SummaryCard
            value={result.successful}
            label="Successful"
          />

          <SummaryCard
            value={result.failed}
            label="Failed"
          />
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Processing results
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Review the status and classification suggestions for each document.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {result.results.map((item, index) => {
            const documentName =
  item.document?.fileName ?? item.fileName ?? "Unknown document";

            return (
              <div
                key={
                  item.document?.id ??
                  `${item.fileName}-${index}`
                }
                className="px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  {/* Document */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                      {getFileIcon(documentName)}
                    </div>

                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-medium text-slate-800"
                        title={documentName}
                      >
                        {documentName}
                      </p>

                      {item.success &&
                        item.suggestions &&
                        item.suggestions.length > 0 && (
                          <p className="mt-1 truncate text-xs text-slate-500">
                            Suggested:{" "}
                            {item.suggestions
                              .map(
                                (suggestion) =>
                                  suggestion.documentType
                              )
                              .join(", ")}
                          </p>
                        )}

                      {!item.success && item.error && (
                        <p className="mt-1 text-xs text-red-500">
                          {item.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {item.success ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {item.status || "Failed"}
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  {item.success && item.document && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenDocument(item.document!.id)
                      }
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      Open document
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

function getFileIcon(fileName: string): string {
  const extension =
    fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "📕";
    case "doc":
    case "docx":
      return "📘";
    case "csv":
      return "📊";
    case "jpg":
    case "jpeg":
    case "png":
      return "🖼️";
    default:
      return "📄";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}