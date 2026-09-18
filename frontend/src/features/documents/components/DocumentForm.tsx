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
    type ValidationError,
} from "../jsonApi";

import {
    getDocumentTypeById,
    type DocumentType,
} from "../../document-types/api";

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

  /*
   * Load document, document type and draft
   */
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

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

        const draft =
          await getDraft(documentId);

        if (draft.draftData) {
          setFormData(draft.draftData);
        }
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
   * Handle field changes
   */
  function handleFieldChange(
    name: string,
    value: unknown
  ) {
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setValidationErrors([]);
    setGenerationError("");
    setGenerationSuccess(false);
    setGeneratedJSON(null);
  }

  /*
   * Automatically save draft
   */
  useEffect(() => {
    if (loading) return;
    if (!documentType) return;

    const timeout = setTimeout(
      async () => {
        try {
          setSavingDraft(true);

          await saveDraft(
            documentId,
            formData
          );
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

    return () => clearTimeout(timeout);
  }, [
    formData,
    documentId,
    documentType,
    loading,
  ]);

  /*
   * Generate JSON
   */
  async function handleGenerateJSON() {
    try {
      setGeneratingJSON(true);

      setGenerationError("");
      setGenerationSuccess(false);
      setValidationErrors([]);
      setGeneratedJSON(null);

      const result =
        await generateDocumentJSON(
          documentId,
          formData
        );

      /*
       * AJV validation failed
       */
      if (!result.valid) {
        setValidationErrors(
          result.errors ?? []
        );

        return;
      }

      /*
       * JSON generated successfully
       */
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
      setGeneratingJSON(false);
    }
  }

  /*
   * Copy generated JSON
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
   * Download generated JSON
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

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `${baseName}.json`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /*
   * Loading
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
   * General error
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
   * Missing document or template
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
   * DocumentType stores jsonSchema as unknown,
   * so convert it to our JSONSchema type.
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

          currentDocument.extractedText ? (
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
              (
                validationError,
                index
              ) => (
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
          GENERATE ACTION
          ===================================================== */}

      {!generationSuccess && (
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h3 className="font-semibold text-slate-900">
              Ready to generate?
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Validate the information and create the
              structured JSON output.
            </p>

          </div>


          <button
            type="button"
            onClick={handleGenerateJSON}
            disabled={generatingJSON}
            className="shrink-0 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {generatingJSON
              ? "Generating..."
              : "Generate JSON →"}
          </button>

        </section>
      )}


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


      {/* =====================================================
          DOCUMENT PREVIEW / EXTRACTED TEXT MODAL
          ===================================================== */}

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