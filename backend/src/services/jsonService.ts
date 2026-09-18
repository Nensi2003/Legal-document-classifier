import { db } from "@/prisma/db";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import { validateJSON } from "./jsonValidationService";

export async function generateJSON(
  documentId: number,
  userId: number,
  data: JsonValue
) {
  const document =
    await db.orm.public.Document
      .where({
        id: documentId,
        userId,
      })
      .first();

  if (!document) {
    throw new Error("Document not found");
  }

  if (!document.documentTypeId) {
    throw new Error(
      "Document type has not been selected"
    );
  }

  const documentType =
    await db.orm.public.DocumentType
      .where({
        id: document.documentTypeId,
      })
      .first();

  if (!documentType) {
    throw new Error("Document type not found");
  }

  const validation =
    validateJSON(
      data,
      documentType.jsonSchema
    );

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }

  const existingJSON =
    await db.orm.public.GeneratedJSON
      .where({
        documentId,
      })
      .first();

  if (existingJSON) {
    const updated =
      await db.orm.public.GeneratedJSON
        .where({
          documentId,
        })
        .update({
          data,
          isValid: true,
        });

   await db.orm.public.Document
  .where({
    id: documentId,
  })
  .update({
    status: "COMPLETED",
    draftData: null,
  });

    return {
      valid: true,
      generatedJSON: updated,
    };
  }

  const created =
    await db.orm.public.GeneratedJSON.create({
      data,
      isValid: true,
      documentId,
    });

  await db.orm.public.Document
    .where({
      id: documentId,
    })
    .update({
      status: "COMPLETED",
       draftData: null,
    });

  return {
    valid: true,
    generatedJSON: created,
  };
}