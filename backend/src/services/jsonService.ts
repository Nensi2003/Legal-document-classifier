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
    throw new Error("Document type has not been selected");
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

  let generatedJSON;

  if (existingJSON) {
    generatedJSON =
      await db.orm.public.GeneratedJSON
        .where({
          documentId,
        })
        .update({
          data,
          isValid: true,
        });
  } else {
    generatedJSON =
      await db.orm.public.GeneratedJSON.create({
        data,
        isValid: true,
        documentId,
      });
  }

  await db.orm.public.Document
    .where({
      id: documentId,
      userId,
    })
    .update({
      status: "COMPLETED",
      draftData: null,
    });

  // Check whether this document belongs to a batch.
  if (document.batchId) {
    const batchDocuments =
      await db.orm.public.Document
        .where({
          batchId: document.batchId,
          userId,
        })
        .all();

    const allCompleted = batchDocuments.every(
      (item) => item.status === "COMPLETED"
    );

    if (allCompleted) {
      await db.orm.public.Batch
        .where({
          id: document.batchId,
          userId,
        })
        .update({
          status: "COMPLETED",
        });
    }
  }

  return {
    valid: true,
    generatedJSON,
  };
}