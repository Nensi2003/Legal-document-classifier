import { useEffect, useState } from "react";

import {
  confirmDocumentBoundaries,
  getDocumentInstances,
  type DocumentInstance,
} from "../boundaryApi";

import { DocumentPreview } from "./DocumentPreview";

interface DocumentBoundaryReviewProps {
  documentId: number;
  fileName: string;
  mimeType: string;
  onConfirmed: () => void;
}

export function DocumentBoundaryReview({
  documentId,
  fileName,
  mimeType,
  onConfirmed,
}: DocumentBoundaryReviewProps) {
  const [instances, setInstances] = useState<DocumentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInstances() {
      try {
        setLoading(true);
        setError("");

        const result =
          await getDocumentInstances(documentId);

        if (!cancelled) {
          setInstances(result);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load document boundaries."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInstances();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function handleConfirm() {
    try {
      setConfirming(true);
      setError("");

      await confirmDocumentBoundaries(documentId);

      onConfirmed();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to confirm document boundaries."
      );
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="text-sm text-slate-500">
            Loading document boundaries...
          </p>
        </div>
      </div>
    );
  }

  if (error && instances.length === 0) {
    return (
      <div className="flex min-h-[500px] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
            !
          </div>

          <h2 className="font-semibold text-slate-800">
            Unable to load boundary review
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-semibold text-slate-900">
            Review Document Boundaries
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            We detected {instances.length} document instances.
            Review the detected page boundaries before continuing.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-medium text-slate-900">
                Original Document
              </h2>

              <p className="mt-1 truncate text-xs text-slate-500">
                {fileName}
              </p>
            </div>

            <DocumentPreview
              documentId={documentId}
              fileName={fileName}
              mimeType={mimeType}
            />
          </div>

          <div className="h-fit rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-medium text-slate-900">
                Detected Instances
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Check where each document instance starts and ends.
              </p>
            </div>

            <div className="space-y-3 p-4">
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      Instance {instance.position}
                    </span>

                    {instance.detectionScore !== null &&
                      instance.detectionScore !== undefined && (
                        <span className="text-xs text-slate-500">
                          Score: {instance.detectionScore}
                        </span>
                      )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Start page
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        {instance.startPage}
                      </p>
                    </div>

                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        End page
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        {instance.endPage}
                      </p>
                    </div>
                  </div>

                  {instance.detectionMethod && (
                    <p className="mt-3 text-xs text-slate-500">
                      Detection method:{" "}
                      <span className="font-medium text-slate-700">
                        {instance.detectionMethod}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || instances.length <= 1}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirming
                  ? "Confirming..."
                  : "Confirm Boundaries"}
              </button>

              <p className="mt-2 text-center text-xs text-slate-500">
                After confirmation, you can continue to the
                document form.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
