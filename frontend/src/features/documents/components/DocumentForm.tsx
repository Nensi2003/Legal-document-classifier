import { useEffect, useState } from "react";

import {
  getDocumentById,
  type Document,
} from "../api";

import {
  getDraft,
  saveDraft,
} from "../draftApi";

import {
  generateDocumentJSON,
  generateInstanceJSON,
  generateCombinedJSON,
  type ValidationError,
} from "../jsonApi";

import {
  getDocumentTypeById,
  type DocumentType,
} from "../../document-types/api";

import {
  getDocumentInstances,
  saveInstanceDraft,
  type DocumentInstance,
} from "../instancesApi";

import type { JSONSchema } from "../../../types/jsonSchema";

import { DocumentPreview } from "./DocumentPreview";
import { DynamicField } from "./DynamicField";

interface DocumentFormProps {
  documentId: number;
  onBack: () => void;
}

export function DocumentForm({
  documentId,
  onBack,
}: DocumentFormProps) {
  const [currentDocument, setCurrentDocument] =
    useState<Document | null>(null);

  const [instances, setInstances] =
    useState<DocumentInstance[]>([]);

  const [currentInstanceIndex, setCurrentInstanceIndex] =
    useState(0);

  const [previewMode, setPreviewMode] = useState<
    "document" | "text"
  >("text");

  const [documentType, setDocumentType] =
    useState<DocumentType | null>(null);

  const [formData, setFormData] =
    useState<Record<string, unknown>>({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [savingDraft, setSavingDraft] =
    useState(false);

  const [generatingJSON, setGeneratingJSON] =
    useState(false);

  const [generationSuccess, setGenerationSuccess] =
    useState(false);

  const [generationError, setGenerationError] =
    useState("");

  const [validationErrors, setValidationErrors] =
    useState<ValidationError[]>([]);

  const [generatedJSON, setGeneratedJSON] =
    useState<unknown>(null);

  const currentInstance =
    instances[currentInstanceIndex] ?? null;

  const [draftDirty, setDraftDirty] =
    useState(false);

  /*
   * ============================================================
   * Load document, document type, instances and drafts
   * ============================================================
   */
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setCurrentInstanceIndex(0);

        const documentData =
          await getDocumentById(documentId);

        setCurrentDocument(documentData);

        if (!documentData.documentTypeId) {
          setError(
            "This document does not have a document type yet."
          );
          return;
        }

        const documentTypeData =
          await getDocumentTypeById(
            documentData.documentTypeId
          );

        setDocumentType(documentTypeData);

        /*
         * Load detected document instances.
         *
         * For a multi-document PDF:
         *   Instance 1 → pages 1–2
         *   Instance 2 → pages 3–4
         *   Instance 3 → pages 5–6
         *
         * For an older/single document without instances,
         * we fall back to the existing Document draft.
         */
        const documentInstances =
          await getDocumentInstances(documentId);

        setInstances(documentInstances);
        setDraftDirty(false);

        if (documentInstances.length > 0) {
          const firstInstance =
            documentInstances[0];

          if (firstInstance.draftData) {
            setFormData(firstInstance.draftData);
          } else {
            setFormData({});
          }
        } else {
          /*
           * Backward compatibility:
           * documents created before DocumentInstance
           * support can still use the parent Document draft.
           */
          const draft =
            await getDraft(documentId);

          if (draft.draftData) {
            setFormData(draft.draftData);
          } else {
            setFormData({});
          }
        }

        setValidationErrors([]);
        setGenerationError("");
        setGenerationSuccess(false);
        setGeneratedJSON(null);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load document."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [documentId]);

  /*
   * ============================================================
   * Handle field changes
   * ============================================================
   */
  function handleFieldChange(
    name: string,
    value: unknown
  ) {
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setDraftDirty(true);

    setValidationErrors([]);
    setGenerationError("");
    setGenerationSuccess(false);
    setGeneratedJSON(null);
  }

  /*
   * ============================================================
   * Automatically save draft
   *
   * Multi-instance documents:
   *   save to DocumentInstance.draftData
   *
   * Older/single documents without instances:
   *   save to Document.draftData
   * ============================================================
   */
  useEffect(() => {
    if (loading) return;
    if (!documentType) return;
    if (!draftDirty) return;

    // Track only the ID, not the whole instance object.
    // Updating instances after a save must not restart autosave.
    const instanceId = currentInstance?.id ?? null;

    const timeout = setTimeout(
      async () => {
        try {
          setSavingDraft(true);

          if (instanceId !== null) {
            const savedInstance =
              await saveInstanceDraft(
                documentId,
                instanceId,
                formData
              );

            // Keep the local instance snapshot synchronized
            // without changing the instance ID.
            setInstances((currentInstances) =>
              currentInstances.map((instance) =>
                instance.id === instanceId
                  ? {
                      ...instance,
                      draftData:
                        savedInstance.draftData,
                      status:
                        savedInstance.status,
                    }
                  : instance
              )
            );
          } else {
            await saveDraft(
              documentId,
              formData
            );
          }

          setDraftDirty(false);
        } catch (error) {
          console.error(
            "Failed to save draft:",
            error
          );
        } finally {
          setSavingDraft(false);
        }
      },
      700
    );

    return () =>
      clearTimeout(timeout);
  }, [
    formData,
    documentId,
    documentType,
    loading,
    draftDirty,
    currentInstance?.id,
  ]);

  /*
   * ============================================================
   * Switch between document instances
   * ============================================================
   */
  async function handleInstanceChange(
    nextIndex: number
  ) {
    if (
      nextIndex < 0 ||
      nextIndex >= instances.length ||
      nextIndex === currentInstanceIndex
    ) {
      return;
    }

    try {
      /*
       * Only save when the current instance has
       * unsaved user changes.
       */
      if (currentInstance && draftDirty) {
        setSavingDraft(true);

        const savedInstance =
          await saveInstanceDraft(
            documentId,
            currentInstance.id,
            formData
          );

        setInstances((currentInstances) =>
          currentInstances.map((instance) =>
            instance.id === currentInstance.id
              ? {
                  ...instance,
                  draftData:
                    savedInstance.draftData,
                  status:
                    savedInstance.status,
                }
              : instance
          )
        );
      }

      const nextInstance =
        instances[nextIndex];

      setCurrentInstanceIndex(nextIndex);

      setFormData(
        nextInstance.draftData ?? {}
      );

      setDraftDirty(false);

      setValidationErrors([]);
      setGenerationError("");
      setGenerationSuccess(false);
      setGeneratedJSON(null);
    } catch (error) {
      console.error(
        "Failed to switch document instance:",
        error
      );
    } finally {
      setSavingDraft(false);
    }
  }

  /*
   * ============================================================
   * Generate JSON for current instance
   * ============================================================
   */
  async function handleGenerateInstanceJSON() {
    if (!currentInstance) {
      setGenerationError("No document instance is selected.");
      return;
    }

    try {
      setGeneratingJSON(true);
      setGenerationError("");
      setGenerationSuccess(false);
      setValidationErrors([]);
      setGeneratedJSON(null);

      // Make sure the latest field changes are saved before generating.
      if (draftDirty) {
        setSavingDraft(true);

        const savedInstance = await saveInstanceDraft(
          documentId,
          currentInstance.id,
          formData
        );

        setInstances((currentInstances) =>
          currentInstances.map((instance) =>
            instance.id === currentInstance.id
              ? {
                  ...instance,
                  draftData: savedInstance.draftData,
                  status: savedInstance.status,
                }
              : instance
          )
        );

        setDraftDirty(false);
        setSavingDraft(false);
      }

      const result = await generateInstanceJSON(
        documentId,
        currentInstance.id
      );

      if (!result.valid) {
        setValidationErrors((result.errors ?? []) as ValidationError[]);
        return;
      }

      const generatedData =
        result.instance?.generatedJSON ?? null;

      setGeneratedJSON(generatedData);
      setGenerationSuccess(true);

      // Keep the local instance state synchronized.
      setInstances((currentInstances) =>
        currentInstances.map((instance) =>
          instance.id === currentInstance.id
            ? {
                ...instance,
                status: result.instance?.status ?? "COMPLETED",
                generatedJSON: generatedData,
              }
            : instance
        )
      );
    } catch (error) {
      console.error(error);

      setGenerationError(
        error instanceof Error
          ? error.message
          : "Failed to generate instance JSON."
      );
    } finally {
      setSavingDraft(false);
      setGeneratingJSON(false);
    }
  }

  /*
   * ============================================================
   * Generate combined JSON
   *
   * The backend uses the current draftData of every instance.
   * It does not depend on individual generatedJSON values.
   * ============================================================
   */
  async function handleGenerateSingleDocumentJSON() {
  try {
    setGeneratingJSON(true);
    setGenerationError("");
    setGenerationSuccess(false);
    setValidationErrors([]);
    setGeneratedJSON(null);

    // Save the latest form changes first.
    if (draftDirty) {
      setSavingDraft(true);

      await saveDraft(
        documentId,
        formData
      );

      setDraftDirty(false);
      setSavingDraft(false);
    }

    const result =
      await generateDocumentJSON(
        documentId
      );

    if (!result.valid) {
  setValidationErrors(
    (result.errors ?? []) as ValidationError[]
  );
  return;
}

    setGeneratedJSON(
      result.generatedJSON?.data ?? null
    );

    setGenerationSuccess(true);
  } catch (error) {
    console.error(error);

    setGenerationError(
      error instanceof Error
        ? error.message
        : "Failed to generate JSON."
    );
  } finally {
    setSavingDraft(false);
    setGeneratingJSON(false);
  }
}


  async function handleGenerateCombinedJSON() {
    try {
      setGeneratingJSON(true);
      setGenerationError("");
      setGenerationSuccess(false);
      setValidationErrors([]);
      setGeneratedJSON(null);

      // A document without instances is a normal single document.
      if (instances.length === 0) {
        if (draftDirty) {
          setSavingDraft(true);

          await saveDraft(
            documentId,
            formData
          );

          setDraftDirty(false);
          setSavingDraft(false);
        }

        const result = await generateDocumentJSON(
          documentId
        );

        if (!result.valid) {
          setValidationErrors(
            (result.errors ?? []) as ValidationError[]
          );
          return;
        }

        setGeneratedJSON(
          result.generatedJSON?.data ?? null
        );
        setGenerationSuccess(true);
        return;
      }

      // For multi-instance documents, save the current instance first
      // so the combined JSON includes the latest edits.
      if (currentInstance && draftDirty) {
        setSavingDraft(true);

        const savedInstance =
          await saveInstanceDraft(
            documentId,
            currentInstance.id,
            formData
          );

        setInstances((currentInstances) =>
          currentInstances.map((instance) =>
            instance.id === currentInstance.id
              ? {
                  ...instance,
                  draftData: savedInstance.draftData,
                  status: savedInstance.status,
                }
              : instance
          )
        );

        setDraftDirty(false);
        setSavingDraft(false);
      }

      const result = await generateCombinedJSON(
        documentId
      );

      if (!result.valid) {
       const groupedErrors = result.errors ?? [];

if (groupedErrors.length === 0) {
  setValidationErrors([]);
} else {
  const firstError = groupedErrors[0];

  if (
    firstError &&
    typeof firstError === "object" &&
    "instanceId" in firstError
  ) {
    const instanceErrors =
      groupedErrors as Array<{
        instanceId: number;
        errors: ValidationError[];
      }>;

    const currentErrors =
      instanceErrors.find(
        (item: {
          instanceId: number;
          errors: ValidationError[];
        }) =>
          item.instanceId ===
          currentInstance?.id
      );

    setValidationErrors(
      currentErrors?.errors ?? []
    );
  } else {
    const validationErrors =
      groupedErrors as ValidationError[];

    setValidationErrors(validationErrors);
  }
}

        setGenerationError(
          "Some document instances contain validation errors. Please review them before generating the combined JSON."
        );

        return;
      }

      setGeneratedJSON(
        result.generatedJSON?.data ?? null
      );
      setGenerationSuccess(true);
    } catch (error) {
      console.error(error);

      setGenerationError(
        error instanceof Error
          ? error.message
          : "Failed to generate combined JSON."
      );
    } finally {
      setSavingDraft(false);
      setGeneratingJSON(false);
    }
  }
  /*
   * Copy generated JSON
   * ============================================================
   */
  async function handleCopyJSON() {
    if (generatedJSON === null) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          generatedJSON,
          null,
          2
        )
      );
    } catch (error) {
      console.error(
        "Failed to copy JSON:",
        error
      );
    }
  }

  /*
   * ============================================================
   * Download generated JSON
   * ============================================================
   */
  function handleDownloadJSON() {
    if (generatedJSON === null) {
      return;
    }

    const jsonString =
      JSON.stringify(
        generatedJSON,
        null,
        2
      );

    const blob = new Blob(
      [jsonString],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const originalName =
      currentDocument?.fileName ??
      "document";

    const baseName =
      originalName.replace(
        /\.[^/.]+$/,
        ""
      );

    const instanceSuffix =
      currentInstance
        ? `-instance-${currentInstance.position}`
        : "";

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `${baseName}${instanceSuffix}.json`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /*
   * ============================================================
   * Loading
   * ============================================================
   */
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Loading document...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * General error
   * ============================================================
   */
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to Documents
        </button>

        <p
          role="alert"
          className="text-sm font-medium text-red-700"
        >
          {error}
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * Missing document or template
   * ============================================================
   */
  if (!currentDocument || !documentType) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to Documents
        </button>

        <p className="text-sm text-slate-500">
          Document information is unavailable.
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * Document schema
   * ============================================================
   */
  const schema =
    documentType.jsonSchema as JSONSchema;

  return (
    <div className="space-y-6">

      {/* =====================================================
          TOP HEADER
          ===================================================== */}

      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to Documents
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div className="min-w-0">

            <div className="mb-3 flex flex-wrap items-center gap-2">

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Document Workspace
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {documentType.domain}
              </span>

              {instances.length > 1 && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                  {instances.length} documents detected
                </span>
              )}

            </div>

            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {currentDocument.fileName}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Template:{" "}
              <span className="font-medium text-slate-700">
                {documentType.name}
              </span>
            </p>

          </div>

          {/* Draft status */}
          <div className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm lg:self-auto">

            <span
              className={`h-2 w-2 rounded-full ${
                savingDraft
                  ? "animate-pulse bg-amber-400"
                  : "bg-emerald-500"
              }`}
            />

            <span className="text-xs font-medium text-slate-600">
              {savingDraft
                ? "Saving draft..."
                : "Draft saved"}
            </span>

          </div>

        </div>
      </div>

      {/* =====================================================
          INSTANCE NAVIGATION
          ===================================================== */}

      {instances.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Document {currentInstanceIndex + 1} of{" "}
                {instances.length}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Pages{" "}
                {currentInstance?.startPage}–
                {currentInstance?.endPage}
              </p>
            </div>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  handleInstanceChange(
                    currentInstanceIndex - 1
                  )
                }
                disabled={
                  currentInstanceIndex === 0 ||
                  savingDraft
                }
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  handleInstanceChange(
                    currentInstanceIndex + 1
                  )
                }
                disabled={
                  currentInstanceIndex ===
                    instances.length - 1 ||
                  savingDraft
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Next →
              </button>

            </div>

          </div>

        </section>
      )}

      {/* =====================================================
          MAIN WORKSPACE
          ===================================================== */}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">

        {/* =================================================
            LEFT: DOCUMENT / EXTRACTED TEXT
            ================================================= */}

        <section className="min-w-0 self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Preview header */}
          <div className="border-b border-slate-200 px-5 py-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">

                <h2 className="font-semibold text-slate-900">
                  {previewMode === "text"
                    ? "Extracted Text"
                    : "Document Preview"}
                </h2>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {currentDocument.fileName}
                </p>

                {currentInstance && (
                  <p className="mt-1 text-xs font-medium text-blue-600">
                    Pages{" "}
                    {currentInstance.startPage}–
                    {currentInstance.endPage}
                  </p>
                )}

              </div>

              {/* Preview buttons */}
              <div className="flex shrink-0 gap-2">

                {/* Extracted text */}
                <button
                  type="button"
                  onClick={() =>
                    setPreviewMode("text")
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    previewMode === "text"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>📝</span>
                  Extracted text
                </button>

                {/* Document preview */}
                <button
                  type="button"
                  onClick={() =>
                    setPreviewMode("document")
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    previewMode === "document"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>👁</span>
                  Document preview
                </button>

              </div>

            </div>

          </div>

          {/* Preview content */}
          <div className="p-5">

            <div className="h-[650px] overflow-auto rounded-xl border border-slate-200 bg-slate-50">

              {previewMode === "text" ? (

                currentInstance?.extractedText ? (

                  <pre className="whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-slate-600">
                    {currentInstance.extractedText}
                  </pre>

                ) : currentDocument.extractedText ? (

                  <pre className="whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-slate-600">
                    {currentDocument.extractedText}
                  </pre>

                ) : (

                  <div className="flex h-full items-center justify-center p-8 text-center">

                    <div>

                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                        📝
                      </div>

                      <p className="text-sm font-medium text-slate-700">
                        No extracted text available
                      </p>

                      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                        The document does not contain readable
                        extracted content.
                      </p>

                    </div>

                  </div>

                )

              ) : (

                <DocumentPreview
                  documentId={currentDocument.id}
                  fileName={currentDocument.fileName}
                  mimeType={currentDocument.mimeType}
                />

              )}

            </div>

          </div>

        </section>


        {/* =================================================
            RIGHT: STRUCTURED FORM
            ================================================= */}

        <section className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Form header */}
          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="font-semibold text-slate-900">
              {documentType.name} Information
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Complete the structured fields below.
              Your progress is saved automatically.
            </p>

          </div>


          {/* Fields */}
          <div className="p-6">

            <div className="space-y-5">

              {Object.entries(
                schema.properties
              ).map(
                ([name, fieldSchema]) => (
                  <DynamicField
                    key={name}
                    name={name}
                    schema={fieldSchema}
                    value={formData[name]}
                    required={
                      schema.required?.includes(
                        name
                      ) ?? false
                    }
                    onChange={(value) =>
                      handleFieldChange(
                        name,
                        value
                      )
                    }
                  />
                )
              )}

            </div>

          </div>

        </section>

      </div>


      {/* =====================================================
          VALIDATION ERRORS
          ===================================================== */}

      {validationErrors.length > 0 && (
  <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-sm text-red-600">
        !
      </div>

      <div>
        <h3 className="font-semibold text-red-900">
          Validation Errors
        </h3>

        <p className="mt-1 text-xs text-red-600">
          Please correct the following fields
          before generating JSON.
        </p>
      </div>
    </div>

    <div className="space-y-3">
      {validationErrors.map(
        (validationError, index) => (
          <div
            key={index}
            className="rounded-lg border border-red-200 bg-white px-4 py-3"
          >
            <p className="text-sm font-semibold text-red-800">
              {getValidationErrorField(
                validationError
              )}
            </p>

            <p className="mt-1 text-sm text-red-600">
              {getValidationErrorMessage(
                validationError
              )}
            </p>
          </div>
        )
      )}
    </div>
  </section>
)}


      {/* =====================================================
          GENERATION ERROR
          ===================================================== */}

      {generationError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-medium text-red-700">
            {generationError}
          </p>
        </div>
      )}


      {/* =====================================================
          GENERATE ACTIONS
          ===================================================== */}

      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="font-semibold text-slate-900">
            Generate JSON
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Generate JSON for the current document instance or combine all document instances into one JSON output.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {currentInstance && (
            <button
              type="button"
              onClick={handleGenerateInstanceJSON}
              disabled={generatingJSON || savingDraft}
              className="shrink-0 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {generatingJSON
                ? "Generating..."
                : `Generate Instance ${currentInstance.position} JSON →`}
            </button>
          )}

          <button
            type="button"
            onClick={
              instances.length > 0
                ? handleGenerateCombinedJSON
                : handleGenerateSingleDocumentJSON
            }
            disabled={generatingJSON || savingDraft}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {generatingJSON
              ? "Generating..."
              : instances.length > 0
                ? "Generate Combined JSON →"
                : "Generate JSON →"
            }
          </button>
        </div>
      </section>

      {/* =====================================================
          JSON SUCCESS
          ===================================================== */}

      {generationSuccess &&
        generatedJSON !== null && (
          <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">

            <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </div>

                  <div>

                    <h2 className="font-semibold text-emerald-900">
                      JSON Generated Successfully
                    </h2>

                    <p className="mt-1 text-xs text-emerald-700">
                      The validated JSON has been saved.
                    </p>

                  </div>

                </div>


                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={handleCopyJSON}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Copy JSON
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJSON}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Download JSON
                  </button>

                </div>

              </div>

            </div>


            <div className="p-5">

              <pre className="max-h-[500px] overflow-auto rounded-xl bg-slate-950 p-5 text-xs leading-6 text-slate-200">
                {JSON.stringify(
                  generatedJSON,
                  null,
                  2
                )}
              </pre>

            </div>

          </section>
        )}

    </div>
  );
}


/*
 * ============================================================
 * Get the field name from an AJV error
 * ============================================================
 */
function getValidationErrorField(
  error: ValidationError
): string {

  /*
   * Required error:
   * AJV doesn't put the missing property
   * in instancePath, so we get it from params.
   */
  if (
    error.keyword === "required" &&
    typeof error.params?.missingProperty ===
      "string"
  ) {
    return error.params.missingProperty;
  }

  /*
   * Other errors:
   *
   * /email
   *    → email
   *
   * /address/city
   *    → address.city
   */
  if (error.instancePath) {
    return error.instancePath
      .replace(/^\//, "")
      .replace(/\//g, ".");
  }

  return "Document";
}


/*
 * ============================================================
 * Convert AJV error into user-friendly message
 * ============================================================
 */
function getValidationErrorMessage(
  error: ValidationError
): string {

  /*
   * Required
   */
  if (error.keyword === "required") {
    return "Please fill in this field.";
  }

  /*
   * Format
   */
  if (error.keyword === "format") {

    const format = String(
      error.params.format
    );

    if (format === "email") {
      return "Please enter a valid email address.";
    }

    return `Please enter a valid ${format}.`;
  }

  /*
   * Pattern
   */
  if (error.keyword === "pattern") {

    if (
      error.params?.pattern ===
      "^\\d{2}/\\d{2}/\\d{4}$"
    ) {
      return "Please enter the date as DD/MM/YYYY.";
    }

    return "Please enter a value in the required format.";
  }

  /*
   * Minimum length
   */
  if (error.keyword === "minLength") {

    const limit =
      error.params.limit;

    return `This value must contain at least ${limit} characters.`;
  }

  /*
   * Maximum length
   */
  if (error.keyword === "maxLength") {

    const limit =
      error.params.limit;

    return `This value must contain no more than ${limit} characters.`;
  }

  /*
   * Minimum number
   */
  if (error.keyword === "minimum") {

    const limit =
      error.params.limit;

    return `The value must be at least ${limit}.`;
  }

  /*
   * Maximum number
   */
  if (error.keyword === "maximum") {

    const limit =
      error.params.limit;

    return `The value must be no more than ${limit}.`;
  }

  /*
   * Enum
   */
  if (error.keyword === "enum") {

    const allowedValues =
      error.params.allowedValues;

    if (Array.isArray(allowedValues)) {
      return `Please select one of: ${allowedValues.join(", ")}.`;
    }

    return "Please select one of the available options.";
  }

  /*
   * Type
   */
  if (error.keyword === "type") {
    return "Please enter a value of the correct type.";
  }

  return (
    error.message ??
    "Invalid value."
  );
}
