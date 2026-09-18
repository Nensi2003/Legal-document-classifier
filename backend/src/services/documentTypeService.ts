import { db } from "@/prisma/db";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";

export async function getDocumentTypes() {
  return db.orm.public.DocumentType.all();
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