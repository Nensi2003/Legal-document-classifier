import { useEffect, useMemo, useState } from "react";

import {
  getDocumentInstances,
  mergeDocumentInstances,
  splitDocumentInstance,
  updateInstanceBoundary,
  type DocumentInstance,
} from "../boundaryApi";

// import { type Document } from "../api";

interface DocumentBoundaryReviewProps {
  documentId: number;
  fileName: string;
  mimeType: string;
  onConfirmed: () => void;
}

export function DocumentBoundaryReview({
  documentId,
  fileName,
//   mimeType,
  onConfirmed,   
}: DocumentBoundaryReviewProps) {

//     console.log("Boundary review document:", document);
//   console.log("Boundary review document.id:", documentId);


  const [instances, setInstances] = useState<DocumentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingInstanceId, setEditingInstanceId] =
    useState<number | null>(null);

  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");

  const [splitInstanceId, setSplitInstanceId] =
    useState<number | null>(null);

  const [splitPage, setSplitPage] = useState("");

  const [selectedInstanceId, setSelectedInstanceId] =
    useState<number | null>(null);

  const sortedInstances = useMemo(
    () =>
      [...instances].sort(
        (a, b) => a.position - b.position
      ),
    [instances]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInstances() {
      try {
        setLoading(true);
        setError("");

        const result = await getDocumentInstances(
            documentId
        );

        if (!cancelled) {
          setInstances(result);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load document instances."
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

  function startEditing(instance: DocumentInstance) {
    setEditingInstanceId(instance.id);
    setStartPage(String(instance.startPage));
    setEndPage(String(instance.endPage));
    setError("");
  }

  function cancelEditing() {
    setEditingInstanceId(null);
    setStartPage("");
    setEndPage("");
  }

  async function handleSaveBoundary() {
    if (editingInstanceId === null) {
      return;
    }

    const parsedStartPage = Number(startPage);
    const parsedEndPage = Number(endPage);

    if (
      !Number.isInteger(parsedStartPage) ||
      !Number.isInteger(parsedEndPage)
    ) {
      setError(
        "Start page and end page must be whole numbers."
      );
      return;
    }

    if (
      parsedStartPage < 1 ||
      parsedEndPage < parsedStartPage
    ) {
      setError("Please enter a valid page range.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const updatedInstance =
        await updateInstanceBoundary(
          documentId,
          editingInstanceId,
          parsedStartPage,
          parsedEndPage
        );

      setInstances((currentInstances) =>
        currentInstances.map((instance) =>
          instance.id === updatedInstance.id
            ? updatedInstance
            : instance
        )
      );

      cancelEditing();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update document boundary."
      );
    } finally {
      setSaving(false);
    }
  }

  function startSplitting(instance: DocumentInstance) {
    setSplitInstanceId(instance.id);
    setSplitPage("");
    setError("");
  }

  function cancelSplitting() {
    setSplitInstanceId(null);
    setSplitPage("");
  }

  async function handleSplit() {
    if (splitInstanceId === null) {
      return;
    }

    const parsedSplitPage = Number(splitPage);

    const instance = instances.find(
      (item) => item.id === splitInstanceId
    );

    if (!instance) {
      setError("Document instance not found.");
      return;
    }

    if (!Number.isInteger(parsedSplitPage)) {
      setError("Split page must be a whole number.");
      return;
    }

    if (
      parsedSplitPage <= instance.startPage ||
      parsedSplitPage > instance.endPage
    ) {
      setError(
        `Split page must be between ${instance.startPage + 1} and ${instance.endPage}.`
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await splitDocumentInstance(
        documentId,
        splitInstanceId,
        parsedSplitPage
      );

      const refreshedInstances =
        await getDocumentInstances(documentId);

      setInstances(refreshedInstances);

      cancelSplitting();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to split document instance."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleMerge(
    firstInstance: DocumentInstance,
    secondInstance: DocumentInstance
  ) {
    const confirmed = window.confirm(
      `Merge Instance ${firstInstance.position} and Instance ${secondInstance.position}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await mergeDocumentInstances(
        documentId  ,
        firstInstance.id,
        secondInstance.id
      );

      const refreshedInstances =
        await getDocumentInstances(documentId);

      setInstances(refreshedInstances);

      setSelectedInstanceId(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to merge document instances."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (instances.length < 2) {
      setError(
        "At least two document instances are required for boundary review."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `http://localhost:3000/api/documents/${documentId}/confirm-boundaries`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to confirm boundaries."
        );
      }

      onConfirmed();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to confirm document boundaries."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="text-sm text-slate-500">
            Loading detected document instances...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onConfirmed}
          disabled={saving}
          className="mb-4 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Back to Documents
        </button>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-2xl font-bold text-slate-900">
            Review Document Boundaries
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            We detected multiple documents inside{" "}
            <span className="font-medium">
              {fileName}
            </span>
            . Review the page ranges before continuing.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Detected Documents
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {instances.length} documents detected
              </p>
            </div>

            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Review required
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {sortedInstances.map((instance, index) => {
            const nextInstance =
              sortedInstances[index + 1];

            const isEditing =
              editingInstanceId === instance.id;

            const isSplitting =
              splitInstanceId === instance.id;

            const isSelected =
              selectedInstanceId === instance.id;

            return (
              <div
                key={instance.id}
                className={`p-6 ${
                  isSelected ? "bg-slate-50" : ""
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        Instance {instance.position}
                      </span>

                      <span className="text-sm font-medium text-slate-700">
                        Pages {instance.startPage}–{instance.endPage}
                      </span>

                      {instance.detectionMethod && (
                        <span className="text-xs text-slate-400">
                          {instance.detectionMethod}
                        </span>
                      )}
                    </div>

                    {instance.extractedText && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Extracted text
                        </p>

                        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {instance.extractedText}
                        </p>
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="mb-3 text-sm font-semibold text-slate-800">
                          Edit page range
                        </p>

                        <div className="flex flex-wrap items-end gap-3">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Start page
                            </span>

                            <input
                              type="number"
                              min={1}
                              value={startPage}
                              onChange={(event) =>
                                setStartPage(
                                  event.target.value
                                )
                              }
                              className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              End page
                            </span>

                            <input
                              type="number"
                              min={1}
                              value={endPage}
                              onChange={(event) =>
                                setEndPage(
                                  event.target.value
                                )
                              }
                              className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={handleSaveBoundary}
                            disabled={saving}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={saving}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isSplitting && (
                      <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                        <p className="mb-1 text-sm font-semibold text-slate-800">
                          Split this document
                        </p>

                        <p className="mb-3 text-xs text-slate-500">
                          The split page becomes the first page
                          of the new instance.
                        </p>

                        <div className="flex flex-wrap items-end gap-3">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Split at page
                            </span>

                            <input
                              type="number"
                              min={
                                instance.startPage + 1
                              }
                              max={instance.endPage}
                              value={splitPage}
                              onChange={(event) =>
                                setSplitPage(
                                  event.target.value
                                )
                              }
                              className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={handleSplit}
                            disabled={saving}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Split
                          </button>

                          <button
                            type="button"
                            onClick={cancelSplitting}
                            disabled={saving}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:w-auto lg:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInstanceId(
                          isSelected
                            ? null
                            : instance.id
                        );
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {isSelected
                        ? "Hide details"
                        : "Details"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        startEditing(instance)
                      }
                      disabled={saving}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit pages
                    </button>

                    {instance.endPage >
                      instance.startPage && (
                      <button
                        type="button"
                        onClick={() =>
                          startSplitting(instance)
                        }
                        disabled={saving}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Split
                      </button>
                    )}

                    {nextInstance && (
                      <button
                        type="button"
                        onClick={() =>
                          handleMerge(
                            instance,
                            nextInstance
                          )
                        }
                        disabled={saving}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Merge with next
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">
            Boundaries look correct?
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Confirming will lock the boundaries and continue
            to document type selection.
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || instances.length < 2}
          className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Confirm Boundaries"}
        </button>
      </div>
    </div>
  );
}