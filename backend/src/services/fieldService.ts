import { db } from "@/prisma/db";

export async function getFieldsByDocumentType(
    documentTypeId: number) {
  return db.orm.public.Field
    .where({ documentTypeId })
    .all();
}

export async function createField(data: {
  name: string;
  type: string;
  required?: boolean;
  validationRule?: string;
  documentTypeId: number;
}) {
  return db.orm.public.Field.create({
    name: data.name,
    type: data.type,
    required: data.required ?? false,
    validationRule: data.validationRule,
    documentTypeId: data.documentTypeId,
  });
}

export async function getFieldById(id: number) {
  return db.orm.public.Field
    .where({ id })
    .first();
}

export async function updateField(
  id: number,
  data: {
    name?: string;
    type?: string;
    required?: boolean;
    validationRule?: string;
  }
) {
  return db.orm.public.Field
    .where({ id })
    .update(data);
}

export async function deleteField(id: number) {
  return db.orm.public.Field
    .where({ id })
    .delete();
}