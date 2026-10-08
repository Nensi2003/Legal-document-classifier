import { useState } from "react";

import {
  createDocumentType,
  publishDocumentTypeVersion,
  updateDocumentType,
  type DocumentType,
} from "./api";

import type { JSONSchema } from "../../types/jsonSchema";

import { SchemaEditor } from "./SchemaEditor";

interface TemplateEditorProps {
  documentType?: DocumentType;
  canPublish?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

export function TemplateEditor({
  documentType,
  canPublish = true,
  onSaved,
  onCancel,
}: TemplateEditorProps) {
  const isEditing = Boolean(documentType);

  const [name, setName] = useState(
    documentType?.name ?? ""
  );

  const [domain, setDomain] = useState(
    documentType?.domain ?? ""
  );

  const [description, setDescription] = useState(
    documentType?.description ?? ""
  );

  const [schema, setSchema] = useState<JSONSchema>(
    (documentType?.jsonSchema as JSONSchema) ?? {
      type: "object",
      properties: {},
      additionalProperties: false,
    }
  );

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [pendingPublishVersion, setPendingPublishVersion] = useState(
    documentType?.draftVersion ??
      (documentType?.versionStatus === "DRAFT" && documentType.documentTypeVersionId && documentType.versionNumber
        ? { id: documentType.documentTypeVersionId, versionNumber: documentType.versionNumber, status: "DRAFT" }
        : null),
  );
  const [publishing, setPublishing] = useState(false);

  async function handleSubmit() {
    try {
      setLoading(true);
      setError("");

      if (!name.trim()) {
        setError("Template name is required.");
        return;
      }

      if (!domain.trim()) {
        setError("Domain is required.");
        return;
      }

const fieldNames = Object.entries(
  schema.properties ?? {}
).flatMap(([fieldKey, property]) => [
  fieldKey.trim().toLowerCase(),
  (property.title ?? "").trim().toLowerCase(),
]);

const hasDuplicateFieldNames =
  new Set(fieldNames.filter(Boolean)).size !==
  fieldNames.filter(Boolean).length;

if (hasDuplicateFieldNames) {
  setError(
    "Field names and display names must be unique."
  );
  return;
}

      if (documentType) {
        const result = await updateDocumentType(documentType.id, {
          name: name.trim(),
          domain: domain.trim(),
          description: description.trim(),
          jsonSchema: schema,
        });
        if (result.draftVersion) {
          setPendingPublishVersion(result.draftVersion);
          return;
        }
      } else {
        await createDocumentType({
          name: name.trim(),
          domain: domain.trim(),
          description: description.trim(),
          jsonSchema: schema,
        });
      }

      onSaved();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save template."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!documentType || !pendingPublishVersion) return;
    try {
      setPublishing(true);
      setError("");
      await publishDocumentTypeVersion(documentType.id, pendingPublishVersion.id);
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to publish template version.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleActivateArchivedVersion(versionId: number) {
    if (!documentType) return;
    try {
      setPublishing(true);
      setError("");
      await publishDocumentTypeVersion(documentType.id, versionId);
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to activate template version.");
    } finally {
      setPublishing(false);
    }
  }

  const archivedVersions = documentType?.versions?.filter((version) => version.status === "ARCHIVED") ?? [];

  const fieldCount = Object.keys(
    schema.properties ?? {}
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Template Builder
        </p>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          {isEditing
            ? "Edit Template"
            : "Create Template"}
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Define the document type and the fields that
          should be collected when generating JSON.
        </p>
        {documentType?.activeVersion && (
          <p className="mt-2 text-sm text-slate-600">
            Active version: <strong>v{documentType.activeVersion.versionNumber}</strong>
            {pendingPublishVersion && <> · Editing draft <strong>v{pendingPublishVersion.versionNumber}</strong></>}
          </p>
        )}
      </div>

      {/* Basic information */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-base font-semibold text-slate-900">
            Basic information
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Give your template a name and categorize it by
            domain.
          </p>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Template name */}
          <div className="space-y-2">
            <label
              htmlFor="template-name"
              className="block text-sm font-semibold text-slate-700"
            >
              Template Name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="template-name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Employment Contract"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              required
            />

            <p className="text-xs text-slate-400">
              A recognizable name for this document type.
            </p>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <label
              htmlFor="template-domain"
              className="block text-sm font-semibold text-slate-700"
            >
              Domain
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="template-domain"
              value={domain}
              onChange={(event) =>
                setDomain(event.target.value)
              }
              placeholder="e.g. Legal"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              required
            />

            <p className="text-xs text-slate-400">
              The category or domain this template belongs to.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="template-description"
              className="block text-sm font-semibold text-slate-700"
            >
              Description
            </label>

            <textarea
              id="template-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Describe what this template is used for..."
              rows={4}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

            <p className="text-xs text-slate-400">
              Optional information to help users understand
              when to use this template.
            </p>
          </div>
        </div>
      </section>

      {/* Schema */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              JSON fields
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Define the fields that will appear in the
              generated JSON.
            </p>
          </div>

          <div className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {fieldCount}{" "}
            {fieldCount === 1 ? "field" : "fields"}
          </div>
        </div>

        <div className="p-6">
          <SchemaEditor
            schema={schema}
            onChange={setSchema}
          />
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="mt-0.5 font-bold text-red-600">
            !
          </span>

          <div>
            <p className="text-sm font-semibold text-red-800">
              Unable to save template
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      {pendingPublishVersion && canPublish && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Draft v{pendingPublishVersion.versionNumber} is saved. It will be used for new documents after you publish it.
          </p>
          <button type="button" onClick={handlePublish} disabled={publishing || loading} className="mt-3 rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {publishing ? "Publishing…" : `Publish v${pendingPublishVersion.versionNumber}`}
          </button>
        </div>
      )}
      {pendingPublishVersion && !canPublish && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Draft v{pendingPublishVersion.versionNumber} is saved, but publishing is disabled for this account.
        </p>
      )}
      {archivedVersions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Previously published versions</h3>
          <p className="mt-1 text-sm text-slate-600">
            Activate an earlier version to use it for new documents. Existing documents keep their saved version.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {archivedVersions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => void handleActivateArchivedVersion(version.id)}
                disabled={publishing || loading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
              >
                {publishing ? "Activating…" : `Activate v${version.versionNumber}`}
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : isEditing
            ? pendingPublishVersion ? "Save Draft Changes" : "Save Draft"
            : "Create Template"}
        </button>
      </div>
    </div>
  );
}
