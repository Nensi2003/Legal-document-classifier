import { useEffect, useState } from "react";

import {
  getDocumentTypes,
  type DocumentType,
} from "../../document-types/api";

import {
  getClassificationSuggestions,
  type ClassificationSuggestion,
} from "../classificationApi";

import { assignDocumentType } from "../api";

interface DocumentTypeSelectorProps {
  documentId: number;
  onTypeSelected: (documentTypeId: number) => void;
}

export function DocumentTypeSelector({
  documentId,
  onTypeSelected,
}: DocumentTypeSelectorProps) {
  const [suggestions, setSuggestions] =
    useState<ClassificationSuggestion[]>([]);

  const [documentTypes, setDocumentTypes] =
    useState<DocumentType[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selecting, setSelecting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadTypes() {
      try {
        const [
          classificationSuggestions,
          types,
        ] = await Promise.all([
          getClassificationSuggestions(
            documentId
          ),
          getDocumentTypes(),
        ]);

        setSuggestions(
          classificationSuggestions
        );

        setDocumentTypes(types);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load document types"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTypes();
  }, [documentId]);

  async function handleSelect(
    documentTypeId: number
  ) {
    try {
      setSelecting(true);
      setError("");

      await assignDocumentType(
        documentId,
        documentTypeId
      );

      onTypeSelected(documentTypeId);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to select document type"
      );
    } finally {
      setSelecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Analyzing document...
          </p>
        </div>
      </div>
    );
  }

  if (error && documentTypes.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p
          role="alert"
          className="text-sm font-medium text-red-700"
        >
          {error}
        </p>
      </div>
    );
  }

  const suggestedIds = new Set(
    suggestions.map(
      (suggestion) =>
        suggestion.documentTypeId
    )
  );

  const suggestedTypes =
    suggestions
      .map((suggestion) =>
        documentTypes.find(
          (type) =>
            type.id ===
            suggestion.documentTypeId
        )
      )
      .filter(
        (
          type
        ): type is DocumentType =>
          type !== undefined
      );

  const otherTypes =
    documentTypes.filter(
      (type) =>
        !suggestedIds.has(type.id)
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Document classification
          </span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Select Document Type
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Choose the document type that best matches
          your file. Suggested types are based on the
          document's extracted content.
        </p>
      </div>

      {/* Suggested types */}
      {suggestedTypes.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Suggested Types
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                These types were identified from the
                document content.
              </p>
            </div>

            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              {suggestedTypes.length}{" "}
              {suggestedTypes.length === 1
                ? "suggestion"
                : "suggestions"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {suggestedTypes.map((type) => {
              const suggestion =
                suggestions.find(
                  (item) =>
                    item.documentTypeId ===
                    type.id
                );

              return (
                <article
                  key={type.id}
                  className="relative rounded-xl border-2 border-slate-300 bg-white p-6 shadow-sm transition hover:border-slate-900 hover:shadow-md"
                >
                  {/* Suggested badge */}
                  <div className="absolute right-5 top-5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Suggested
                    </span>
                  </div>

                  <div className="pr-24">
                    <h4 className="text-lg font-semibold text-slate-900">
                      {type.name}
                    </h4>

                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                      {type.domain}
                    </p>
                  </div>

                  {type.description && (
                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      {type.description}
                    </p>
                  )}

                  {suggestion &&
                    suggestion.matchedKeywords.length >
                      0 && (
                      <div className="mt-5">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Matched keywords
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {suggestion.matchedKeywords.map(
                            (keyword) => (
                              <span
                                key={keyword}
                                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                              >
                                {keyword}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  <button
                    type="button"
                    disabled={selecting}
                    onClick={() =>
                      handleSelect(type.id)
                    }
                    className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {selecting
                      ? "Selecting..."
                      : "Use this type →"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Other types */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {suggestedTypes.length > 0
              ? "Other Document Types"
              : "Available Document Types"}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            You can select any available type if the
            suggestions are not suitable.
          </p>
        </div>

        {otherTypes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-500">
              No other document types are available.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherTypes.map((type) => (
              <article
                key={type.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <h4 className="font-semibold text-slate-900">
                  {type.name}
                </h4>

                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {type.domain}
                </p>

                {type.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {type.description}
                  </p>
                )}

                <button
                  type="button"
                  disabled={selecting}
                  onClick={() =>
                    handleSelect(type.id)
                  }
                  className="mt-5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selecting
                    ? "Selecting..."
                    : "Use this type"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Error after types loaded */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}