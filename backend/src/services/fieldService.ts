import { db } from "@/prisma/db";
import { getActiveDocumentTypeVersion } from "./documentTypeService";

export async function getFieldsByDocumentType(documentTypeId: number) {
  const version = await getActiveDocumentTypeVersion(documentTypeId);
  return version ? getFieldsByVersion(version.id) : [];
}

export async function getFieldsByVersion(documentTypeVersionId: number) {
  return db.orm.public.Field.where({ documentTypeVersionId }).all();
}

function normalizeFieldName(name: string) { return name.trim().toLowerCase(); }

async function ensureDraft(versionId: number) {
  const version = await db.orm.public.DocumentTypeVersion.where({ id: versionId }).first();
  if (!version) throw new Error("Document type version not found");
  if (version.status !== "DRAFT") throw new Error("Fields can only be changed on a draft version");
  return version;
}

export async function createField(data: { name: string; type: string; required?: boolean; validationRule?: string; documentTypeVersionId: number }) {
  await ensureDraft(data.documentTypeVersionId);
  const existing = await getFieldsByVersion(data.documentTypeVersionId);
  if (existing.some((field) => normalizeFieldName(field.name) === normalizeFieldName(data.name))) throw new Error("A field with this name already exists in this template");
  return db.orm.public.Field.create({ name: data.name.trim(), type: data.type, required: data.required ?? false, validationRule: data.validationRule, documentTypeVersionId: data.documentTypeVersionId });
}

export async function getFieldById(id: number) { return db.orm.public.Field.where({ id }).first(); }

export async function updateField(id: number, data: { name?: string; type?: string; required?: boolean; validationRule?: string }) {
  const field = await getFieldById(id);
  if (!field) throw new Error("Field not found");
  await ensureDraft(field.documentTypeVersionId);
  if (data.name !== undefined) {
    const fields = await getFieldsByVersion(field.documentTypeVersionId);
    if (fields.some((other) => other.id !== id && normalizeFieldName(other.name) === normalizeFieldName(data.name!))) throw new Error("A field with this name already exists in this template");
    data.name = data.name.trim();
  }
  return db.orm.public.Field.where({ id }).update(data);
}

export async function deleteField(id: number) {
  const field = await getFieldById(id);
  if (!field) return null;
  await ensureDraft(field.documentTypeVersionId);
  return db.orm.public.Field.where({ id }).delete();
}
