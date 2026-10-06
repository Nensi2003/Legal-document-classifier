import { useState } from "react";

import { DocumentTypeList } from "./DocumentTypeList";

import {
  deleteDocumentType,
  getFields,
  getDocumentTypeById,
  type DocumentType,
} from "./api";

import { TemplateEditor } from "./TemplateEditor";
import type { JSONSchema, JSONSchemaProperty } from "../../types/jsonSchema";

function mergeRecordedFields(documentType: DocumentType, fields: Awaited<ReturnType<typeof getFields>>): DocumentType {
  const source = documentType.jsonSchema as Partial<JSONSchema> | null;
  const properties: Record<string, JSONSchemaProperty> = { ...(source?.properties ?? {}) };
  const required = new Set(source?.required ?? []);
  const schemaTypes = new Set(["string", "number", "integer", "boolean", "object", "array"]);

  for (const field of fields) {
    if (!(field.name in properties)) {
      const type = schemaTypes.has(field.type) ? field.type as JSONSchemaProperty["type"] : "string";
      properties[field.name] = { type, title: field.name };
    }
    if (field.required) required.add(field.name);
  }

  return {
    ...documentType,
    jsonSchema: {
      ...(source ?? {}),
      type: "object",
      properties,
      ...(required.size ? { required: [...required] } : {}),
    } satisfies JSONSchema,
  };
}

export function TemplatePage({ canPublish = false }: { canPublish?: boolean }) {
  const [editingTemplate, setEditingTemplate] =
    useState<DocumentType | null>(null);

  const [creating, setCreating] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  function refreshTemplates() {
    setRefreshKey((value) => value + 1);
  }

  function handleSaved() {
    setCreating(false);
    setEditingTemplate(null);
    refreshTemplates();
  }

  async function handleEdit(documentType: DocumentType) {
    try {
      setError("");
      setLoadingTemplate(true);
      const fullTemplate = await getDocumentTypeById(documentType.id, undefined, true);
      const fields = fullTemplate.documentTypeVersionId
        ? await getFields(documentType.id, fullTemplate.documentTypeVersionId)
        : [];
      setEditingTemplate(mergeRecordedFields(fullTemplate, fields));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load template");
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function handleDelete(documentType: DocumentType) {
    const confirmed = window.confirm(
      `Delete "${documentType.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteDocumentType(documentType.id);

      refreshTemplates();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete template"
      );
    }
  }

  if (creating || editingTemplate) {
    return (
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <button
          type="button"
          onClick={() => {
            setCreating(false);
            setEditingTemplate(null);
          }}
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
        >
          <span className="text-lg">←</span>
          Back to Templates
        </button>

        <TemplateEditor
          canPublish={canPublish}
          documentType={editingTemplate ?? undefined}
          onSaved={handleSaved}
          onCancel={() => {
            setCreating(false);
            setEditingTemplate(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Configuration
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Templates
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create and manage document types and the fields
            used to generate structured JSON.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setCreating(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
        >
          <span className="text-lg leading-none">+</span>
          Create Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="mt-0.5 text-red-600">!</span>

          <div>
            <p className="text-sm font-semibold text-red-800">
              Something went wrong
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Templates */}
      {loadingTemplate && <p role="status" className="text-sm text-slate-500">Loading template…</p>}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-base font-semibold text-slate-900">
            Your templates
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Templates define the structure of the JSON generated
            from your documents.
          </p>
        </div>

        <div className="p-6">
          <DocumentTypeList
            key={refreshKey}
            onEdit={(documentType) => void handleEdit(documentType)}
            onDelete={handleDelete}
          />
        </div>
      </section>
    </div>
  );
}
