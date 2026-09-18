import { useState } from "react";

import {
  uploadBatch,
  type BatchUploadResponse,
} from "./batchApi";

interface BatchUploadProps {
  onComplete: (
    result: BatchUploadResponse
  ) => void;

  onCancel: () => void;

  onOpenDocument: (
    documentId: number
  ) => void;
}

export function BatchUpload({
  onComplete,
  onCancel,
  onOpenDocument,
}: BatchUploadProps) {
  const [files, setFiles] = useState<File[]>(
    []
  );

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState<BatchUploadResponse | null>(
      null
    );

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    setError("");

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.length > 100) {
      setError(
        "You can select a maximum of 100 files."
      );

      return;
    }

    setFiles(selectedFiles);
    setResult(null);
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError(
        "Please select at least one file."
      );

      return;
    }

    try {
      setUploading(true);
      setError("");
      setResult(null);

      const uploadResult =
        await uploadBatch(files);

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

  return (
    <div>
      <h2>Batch Upload</h2>

      <p>
        Upload up to 100 documents at once.
      </p>

      {!result && (
        <>
          <div>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
              accept=".pdf,.doc,.docx,.csv,.jpg,.jpeg,.png"
            />
          </div>

          {files.length > 0 && (
            <section>
              <h3>
                Selected Files ({files.length})
              </h3>

              {files.map((file, index) => (
                <div key={`${file.name}-${index}`}>
                  <span>
                    {file.name}
                  </span>

                  <span>
                    {" "}
                    ({formatFileSize(file.size)})
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeFile(index)
                    }
                    disabled={uploading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </section>
          )}

          {uploading && (
            <p>
              Processing documents... Please
              wait.
            </p>
          )}

          {error && (
            <p role="alert">
              {error}
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={
                uploading ||
                files.length === 0
              }
            >
              {uploading
                ? "Processing..."
                : `Upload ${files.length || ""} Documents`}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {result && (
        <BatchResults
          result={result}
          onOpenDocument={onOpenDocument}
          onNewBatch={() => {
            setFiles([]);
            setResult(null);
          }}
        />
      )}
    </div>
  );
}

interface BatchResultsProps {
  result: BatchUploadResponse;
  onOpenDocument: (
    documentId: number
  ) => void;
  onNewBatch: () => void;
}

function BatchResults({
  result,
  onOpenDocument,
  onNewBatch,
}: BatchResultsProps) {
  return (
    <section>
      <h3>Batch Processing Complete</h3>

      <p>
        {result.successful} successful ·{" "}
        {result.failed} failed ·{" "}
        {result.total} total
      </p>

      {result.results.map(
        (item, index) => (
          <div
            key={
              item.document?.id ??
              `${item.fileName}-${index}`
            }
          >
            <strong>
              {item.document?.fileName ??
                item.fileName}
            </strong>

            {" "}

            {item.success ? (
              <>
                <span>
                  ✓ Ready
                </span>

                <button
                  type="button"
                  onClick={() =>
                    item.document &&
                    onOpenDocument(
                      item.document.id
                    )
                  }
                >
                  Open
                </button>
              </>
            ) : (
              <span>
                ✗ {item.status}
                {item.error &&
                  ` — ${item.error}`}
              </span>
            )}

            {item.success &&
              item.suggestions &&
              item.suggestions.length > 0 && (
                <p>
                  Suggested:{" "}
                  {item.suggestions
                    .map(
                      (suggestion) =>
                        suggestion.documentType
                    )
                    .join(", ")}
                </p>
              )}
          </div>
        )
      )}

      <button
        type="button"
        onClick={onNewBatch}
      >
        Upload Another Batch
      </button>
    </section>
  );
}

function formatFileSize(
  bytes: number
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}