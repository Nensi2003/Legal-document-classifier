import { db } from "@/prisma/db";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";

export async function getDocumentTypes() {
  return db.orm.public.DocumentType.orderBy((type) => type.id.asc()).all();
}

export async function getDocumentTypeById(id: number) {
  return db.orm.public.DocumentType.where({ id }).first();
}

export async function getDocumentTypeWithVersion(id: number, versionId?: number, includeDraft = false) {
  const documentType = await getDocumentTypeById(id);
  if (!documentType) return null;
  const versions = versionId === undefined ? await getDocumentTypeVersions(id) : null;
  const active = versions?.find((candidate) => candidate.status === "ACTIVE") ?? await getActiveDocumentTypeVersion(id);
  const draft = versions?.filter((candidate) => candidate.status === "DRAFT").at(-1) ?? null;
  const version = versionId === undefined
    ? (includeDraft && draft ? draft : active)
    : await db.orm.public.DocumentTypeVersion.where({ id: versionId, documentTypeId: id }).first();
  if (!version) return versionId === undefined ? { ...documentType, jsonSchema: null, activeVersion: null, draftVersion: draft } : null;
  return {
    ...documentType,
    jsonSchema: version.jsonSchema,
    documentTypeVersionId: version.id,
    versionNumber: version.versionNumber,
    versionStatus: version.status,
    activeVersion: active ? { id: active.id, versionNumber: active.versionNumber, status: active.status } : null,
    draftVersion: draft ? { id: draft.id, versionNumber: draft.versionNumber, status: draft.status } : null,
  };
}

export async function getActiveDocumentTypeVersion(documentTypeId: number) {
  return db.orm.public.DocumentTypeVersion
    .where({ documentTypeId, status: "ACTIVE" }).first();
}

export async function getDocumentTypeVersions(documentTypeId: number) {
  return db.orm.public.DocumentTypeVersion
    .where({ documentTypeId }).orderBy((version) => version.versionNumber.asc()).all();
}

export async function createDocumentType(data: {
  name: string; domain: string; description?: string; jsonSchema: JsonValue;
  fields?: Array<{ name: string; type: string; required?: boolean; validationRule?: string }>;
  status?: "DRAFT" | "ACTIVE";
}) {
  const status = data.status ?? "ACTIVE";
  const type = await db.orm.public.DocumentType.create({
    name: data.name, domain: data.domain, description: data.description,
  });
  const version = await db.orm.public.DocumentTypeVersion.create({
    documentTypeId: type.id, versionNumber: 1, jsonSchema: data.jsonSchema,
    status,
    ...(status === "ACTIVE" ? { publishedAt: new Date().toISOString() } : {}),
  });
  for (const field of data.fields ?? []) {
    await db.orm.public.Field.create({ name: field.name, type: field.type,
      required: field.required ?? false, validationRule: field.validationRule,
      documentTypeVersionId: version.id });
  }
  return status === "ACTIVE"
    ? { ...type, activeVersion: version }
    : { ...type, draftVersion: version };
}

/** Create an editable snapshot. Published versions and their fields are never changed. */
export async function createDocumentTypeDraft(documentTypeId: number, schema?: JsonValue) {
  const versions = await getDocumentTypeVersions(documentTypeId);
  if (!versions.length) throw new Error("Document type has no versions");
  const latest = versions[versions.length - 1];
  const draft = await db.orm.public.DocumentTypeVersion.create({
    documentTypeId, versionNumber: latest.versionNumber + 1,
    jsonSchema: schema ?? latest.jsonSchema, status: "DRAFT",
  });
  const fields = await db.orm.public.Field.where({ documentTypeVersionId: latest.id }).all();
  for (const field of fields) {
    await db.orm.public.Field.create({
      name: field.name, type: field.type, required: field.required,
      validationRule: field.validationRule, documentTypeVersionId: draft.id,
    });
  }
  return draft;
}

export async function publishDocumentTypeVersion(documentTypeId: number, versionId: number) {
  const target = await db.orm.public.DocumentTypeVersion.where({ id: versionId, documentTypeId }).first();
  if (!target) throw new Error("Document type version not found");
  if (target.status === "ACTIVE") return target;
  if (target.status !== "DRAFT") throw new Error("Only draft versions can be published");
  const active = await getActiveDocumentTypeVersion(documentTypeId);
  if (active) await db.orm.public.DocumentTypeVersion.where({ id: active.id }).update({ status: "ARCHIVED" });
  return db.orm.public.DocumentTypeVersion.where({ id: versionId }).update({
    status: "ACTIVE", publishedAt: new Date().toISOString(),
  });
}

export async function updateDocumentType(id: number, data: { name?: string; domain?: string; description?: string; jsonSchema?: JsonValue }) {
  const metadata = { name: data.name, domain: data.domain, description: data.description };
  const updated = await db.orm.public.DocumentType.where({ id }).update(metadata);
  if (data.jsonSchema === undefined) return updated;
  const versions = await getDocumentTypeVersions(id);
  const existingDraft = versions.filter((version) => version.status === "DRAFT").at(-1);
  const draftVersion = existingDraft
    ? await db.orm.public.DocumentTypeVersion.where({ id: existingDraft.id }).update({ jsonSchema: data.jsonSchema })
    : await createDocumentTypeDraft(id, data.jsonSchema);
  return { ...updated, draftVersion };
}

export class DocumentTypeInUseError extends Error {
  constructor() {
    super("This template is linked to existing documents and cannot be deleted. Preserve its history by keeping the template.");
    this.name = "DocumentTypeInUseError";
  }
}

export async function deleteDocumentType(id: number) {
  return db.transaction(async (tx) => {
    const versions = await tx.orm.public.DocumentTypeVersion
      .where({ documentTypeId: id }).all();
    const versionIds = new Set(versions.map((version) => version.id));
    const documents = await tx.orm.public.Document.all();
    const isReferenced = documents.some((document) =>
      document.documentTypeId === id ||
      (document.documentTypeVersionId != null && versionIds.has(document.documentTypeVersionId))
    );

    if (isReferenced) throw new DocumentTypeInUseError();

    for (const version of versions) {
      await tx.orm.public.Field.where({ documentTypeVersionId: version.id }).delete();
      await tx.orm.public.DocumentTypeVersion.where({ id: version.id }).delete();
    }

    return tx.orm.public.DocumentType.where({ id }).delete();
  });
}

async function documentsForVersion(documentTypeId: number, versionId: number) {
  const documents = await db.orm.public.Document.where({ documentTypeId, documentTypeVersionId: versionId, status: "COMPLETED" }).all();
  const result = [];
  for (const document of documents) {
    const generatedJSON = await db.orm.public.GeneratedJSON.where({ documentId: document.id }).first();
    if (generatedJSON) result.push({ documentId: document.id, fileName: document.fileName, createdAt: document.createdAt, data: generatedJSON.data });
  }
  return result;
}

export async function getCombinedDocumentTypeJSON(documentTypeId: number, versionNumber?: number) {
  const documentType = await getDocumentTypeById(documentTypeId);
  if (!documentType) throw new Error("Document type not found");
  const versions = await getDocumentTypeVersions(documentTypeId);
  if (versionNumber !== undefined) {
    const version = versions.find((candidate) => candidate.versionNumber === versionNumber);
    if (!version) throw new Error("Document type version not found");
    return { documentType: { id: documentType.id, name: documentType.name, domain: documentType.domain }, version: version.versionNumber, status: version.status, documents: await documentsForVersion(documentTypeId, version.id) };
  }
  return { documentType: { id: documentType.id, name: documentType.name, domain: documentType.domain }, versions: await Promise.all(versions.map(async (version) => ({ version: version.versionNumber, status: version.status, documents: await documentsForVersion(documentTypeId, version.id) }))) };
}
