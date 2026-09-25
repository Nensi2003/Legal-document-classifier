import { db } from "@/prisma/db";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import { validateJSON } from "./jsonValidationService";

/**
 * Generate JSON for a single document that has no DocumentInstance records.
 *
 * The document's parent-level draftData is validated against
 * the selected document type schema.
 */
export async function generateDocumentJSON(
  documentId: number,
  userId: number
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

  // A single-document JSON generation is only for documents
  // that do not have DocumentInstance records.
  const instances =
    await db.orm.public.DocumentInstance
      .where({
        documentId,
      })
      .all();

  if (instances.length > 0) {
    throw new Error(
      "This document contains document instances. Use instance JSON generation instead."
    );
  }

  if (!document.draftData) {
    throw new Error(
      "Document has no data to generate JSON from"
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
      document.draftData as JsonValue,
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
          data: document.draftData,
          isValid: true,
        });
  } else {
    generatedJSON =
      await db.orm.public.GeneratedJSON.create({
        data: document.draftData,
        isValid: true,
        documentId,
      });
  }

  // A single document is completed once its JSON is generated.
  await db.orm.public.Document
    .where({
      id: documentId,
      userId,
    })
    .update({
      status: "COMPLETED",
    });

  return {
    valid: true,
    generatedJSON,
  };
}

/**
 * Generate JSON for one document instance.
 *
 * The instance's draftData is validated against the
 * parent document's selected document type schema.
 */
export async function generateInstanceJSON(
  documentId: number,
  instanceId: number,
  userId: number
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

  const instance =
    await db.orm.public.DocumentInstance
      .where({
        id: instanceId,
        documentId,
      })
      .first();

  if (!instance) {
    throw new Error("Document instance not found");
  }

  if (!instance.draftData) {
    throw new Error(
      "Document instance has no data to generate JSON from"
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
      instance.draftData,
      documentType.jsonSchema
    );

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }

  const updatedInstance =
    await db.orm.public.DocumentInstance
      .where({
        id: instanceId,
        documentId,
      })
      .update({
        generatedJSON: instance.draftData,
        status: "COMPLETED",
      });

  return {
    valid: true,
    instance: updatedInstance,
  };
}

/**
 * Generate one combined JSON for a multi-instance document.
 *
 * This does NOT depend on individual generatedJSON values.
 * It always uses the current draftData of every instance.
 */
export async function generateCombinedJSON(
  documentId: number,
  userId: number
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

  const instances =
    await db.orm.public.DocumentInstance
      .where({
        documentId,
      })
      .all();

  if (instances.length === 0) {
    throw new Error(
      "No document instances found for combined JSON"
    );
  }

  for (const instance of instances) {
    if (!instance.draftData) {
      return {
        valid: false,
        errors: [
          {
            instanceId: instance.id,
            message: "Document instance has no data",
          },
        ],
      };
    }
  }

  const validationErrors: Array<{
    instanceId: number;
    errors: unknown;
  }> = [];

  for (const instance of instances) {
    const validation =
      validateJSON(
        instance.draftData as JsonValue,
        documentType.jsonSchema
      );

    if (!validation.valid) {
      validationErrors.push({
        instanceId: instance.id,
        errors: validation.errors,
      });
    }
  }

  if (validationErrors.length > 0) {
    return {
      valid: false,
      errors: validationErrors,
    };
  }

  const combinedData = {
    documentType: documentType.name,
    instances: instances.map(
      (instance) => instance.draftData
    ),
  };

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
        data: combinedData,
        isValid: true,
      });
} else {
  generatedJSON =
    await db.orm.public.GeneratedJSON.create({
      data: combinedData,
      isValid: true,
      documentId,
    });
}

// A multi-instance document is completed once
// the combined JSON is successfully generated.
await db.orm.public.Document
  .where({
    id: documentId,
    userId,
  })
  .update({
    status: "COMPLETED",
  });

return {
  valid: true,
  generatedJSON,
};
}