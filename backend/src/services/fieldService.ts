import { db } from "@/prisma/db";

export async function getFieldsByDocumentType(
  documentTypeId: number
) {
  return db.orm.public.Field
    .where({ documentTypeId })
    .all();
}

function normalizeFieldName(name: string) {
  return name.trim().toLowerCase();
}

export async function createField(data: {
  name: string;
  type: string;
  required?: boolean;
  validationRule?: string;
  documentTypeId: number;
}) {
  const normalizedName = normalizeFieldName(data.name);

  const existingFields = await getFieldsByDocumentType(
    data.documentTypeId
  );

  const duplicate = existingFields.some(
    (field) =>
      normalizeFieldName(field.name) === normalizedName
  );

  if (duplicate) {
    throw new Error(
      "A field with this name already exists in this template"
    );
  }

  return db.orm.public.Field.create({
    name: data.name.trim(),
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
  const existingField = await getFieldById(id);

  if (!existingField) {
    throw new Error("Field not found");
  }

  if (data.name !== undefined) {
    const normalizedName = normalizeFieldName(data.name);

    const existingFields = await getFieldsByDocumentType(
      existingField.documentTypeId
    );

    const duplicate = existingFields.some(
      (field) =>
        field.id !== id &&
        normalizeFieldName(field.name) === normalizedName
    );

    if (duplicate) {
      throw new Error(
        "A field with this name already exists in this template"
      );
    }

    data.name = data.name.trim();
  }

  return db.orm.public.Field
    .where({ id })
    .update(data);
}

export async function deleteField(id: number) {
  return db.orm.public.Field
    .where({ id })
    .delete();
}