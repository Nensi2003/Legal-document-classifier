import { getCurrentUser } from "@/lib/auth";
import {
  generateDocumentJSON,
  generateCombinedJSON,
} from "@/services/jsonService";
import { db } from "@/prisma/db";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const documentId = Number(id);

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      return Response.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const document =
      await db.orm.public.Document
        .where({
          id: documentId,
          userId: user.id,
        })
        .first();

    if (!document) {
      return Response.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    /*
     * Check whether this document contains
     * DocumentInstance records.
     */
    const instances =
      await db.orm.public.DocumentInstance
        .where({
          documentId,
        })
        .all();

    /*
     * ---------------------------------------------------------
     * SINGLE DOCUMENT
     * ---------------------------------------------------------
     *
     * No instances means this is the original
     * single-document workflow.
     *
     * Use Document.draftData.
     */
    if (instances.length === 0) {
      const result =
        await generateDocumentJSON(
          documentId,
          user.id
        );

      if (!result.valid) {
        return Response.json(
          {
            valid: false,
            errors: result.errors,
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          valid: true,
          generatedJSON:
            result.generatedJSON,
        },
        { status: 200 }
      );
    }

    /*
     * ---------------------------------------------------------
     * MULTI-INSTANCE DOCUMENT
     * ---------------------------------------------------------
     *
     * Instances exist, so this request is for the
     * combined JSON of those instances.
     */
    const result =
      await generateCombinedJSON(
        documentId,
        user.id
      );

    if (!result.valid) {
      return Response.json(
        {
          valid: false,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        valid: true,
        generatedJSON:
          result.generatedJSON,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Generate document JSON error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate JSON";

    if (
      message === "Document not found" ||
      message ===
        "Document type has not been selected" ||
      message === "Document type not found" ||
      message ===
        "Document has no data to generate JSON from"
    ) {
      return Response.json(
        { error: message },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: "Failed to generate JSON",
      },
      { status: 500 }
    );
  }
}