import { db } from "@/prisma/db";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";

export async function getDocumentTypes() {
  return db.orm.public.DocumentType
    .orderBy((documentType) => documentType.id.asc())
    .all();
}

export async function getDocumentTypeById(id: number) {
  return db.orm.public.DocumentType
    .where({ id })
    .first();
}

export async function createDocumentType(data: {
  name: string;
  domain: string;
  description?: string;
  jsonSchema: JsonValue;
}) {
  return db.orm.public.DocumentType.create({
    name: data.name,
    domain: data.domain,
    description: data.description,
    jsonSchema: data.jsonSchema,
  });
}

export async function updateDocumentType(
  id: number,
  data: {
    name?: string;
    domain?: string;
    description?: string;
    jsonSchema?: JsonValue;
  }
) {
  return db.orm.public.DocumentType
    .where({ id })
    .update(data);
}

export async function deleteDocumentType(id: number) {
  return db.orm.public.DocumentType
    .where({ id })
    .delete();
}



export async function getCombinedDocumentTypeJSON(
  documentTypeId: number
) {
  const documentType =
    await db.orm.public.DocumentType
      .where({ id: documentTypeId })
      .first();

  if (!documentType) {
    throw new Error("Document type not found");
  }

  const documents =
    await db.orm.public.Document
      .where({
        documentTypeId,
        status: "COMPLETED",
      })
      .all();

  const result = [];

  for (const document of documents) {
    const generatedJSON =
      await db.orm.public.GeneratedJSON
        .where({
          documentId: document.id,
        })
        .first();

    if (!generatedJSON) {
      continue;
    }

    result.push({
      documentId: document.id,
      fileName: document.fileName,
      createdAt: document.createdAt,
      data: generatedJSON.data,
    });
  }

  return {
    documentType: {
      id: documentType.id,
      name: documentType.name,
      domain: documentType.domain,
    },
    documents: result,
  };
}