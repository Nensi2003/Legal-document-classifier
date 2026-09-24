import { classifyAndMatchDocument } from "@/services/classificationService";
import { getCurrentUser } from "@/lib/auth";
import { parseDocument } from "@/parsers/documentParser";
import { UnsupportedDocumentTypeError } from "@/parsers/parserErrors";
import { detectDocumentBoundaries } from "@/detection/documentBoundaryDetector";
import { db } from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";

import { getStoredFilePath } from "@/lib/fileStorage";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const documentId = Number(id);

    if (!Number.isInteger(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const document = await db.orm.public.Document
      .where({
        id: documentId,
        userId: user.id,
      })
      .first();

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    try {
  const filePath = getStoredFilePath(document.filePath);

  const parsedDocument = await parseDocument(
    filePath,
    document.mimeType
  );

      /*
       * ---------------------------------------------------------
       * No extractable text
       * ---------------------------------------------------------
       */

      if (!parsedDocument.text.trim()) {
        await db.orm.public.Document
          .where({ id: document.id })
          .update({
            parseStatus: "NO_TEXT",
            parseMessage:
              "The document was opened successfully, but no extractable text was found.",
          });

        return NextResponse.json({
          analysisStatus: "NO_TEXT",
          message:
            "The document was opened successfully, but no extractable text was found.",
          document: {
            id: document.id,
            fileName: document.fileName,
            mimeType: document.mimeType,
          },
        });
      }

      /*
       * ---------------------------------------------------------
       * Save extracted text
       * ---------------------------------------------------------
       */

      await db.orm.public.Document
        .where({ id: document.id })
        .update({
          extractedText: parsedDocument.text,
          parseStatus: "SUCCESS",
          parseMessage: null,
        });

      /*
       * ---------------------------------------------------------
       * Detect internal documents
       *
       * Currently this is primarily useful for PDFs because
       * PDF parsing gives us page-level text.
       * ---------------------------------------------------------
       */

      let instances = [];

      if (
        document.mimeType === "application/pdf" &&
        parsedDocument.pages &&
        parsedDocument.pages.length > 0
      ) {
        const boundaries = detectDocumentBoundaries(
          parsedDocument.pages
        );

        /*
         * Remove old instances if this document is parsed again.
         * This prevents duplicate instances.
         */
        const existingInstances =
  await db.orm.public.DocumentInstance
    .where({ documentId: document.id })
    .all();

console.log(
  "Existing instances before cleanup:",
  existingInstances.map((instance) => instance.id)
);

for (const instance of existingInstances) {
  await db.orm.public.DocumentInstance
    .where({ id: instance.id })
    .delete();
}

const remainingInstances =
  await db.orm.public.DocumentInstance
    .where({ documentId: document.id })
    .all();

console.log(
  "Remaining instances after cleanup:",
  remainingInstances.map((instance) => instance.id)
);

if (remainingInstances.length > 0) {
  throw new Error(
    `Failed to clean up existing document instances. Remaining IDs: ${remainingInstances
      .map((instance) => instance.id)
      .join(", ")}`
  );
}

        /*
         * Create one DocumentInstance for every detected
         * internal document.
         */
        for (const boundary of boundaries) {
          const instancePages = parsedDocument.pages.filter(
            (page) =>
              page.pageNumber >= boundary.startPage &&
              page.pageNumber <= boundary.endPage
          );

          const instanceText = instancePages
            .map((page) => page.text)
            .join("\n\n")
            .trim();

          const instance =
            await db.orm.public.DocumentInstance.create({
              documentId: document.id,
              position: boundary.position,
              startPage: boundary.startPage,
              endPage: boundary.endPage,
              detectionMethod: "RULE_BASED",
              detectionScore: boundary.score,
              extractedText: instanceText,
              status: "DRAFT",
              draftData: null,
              generatedJSON: null,
            });

          instances.push({
            id: instance.id,
            position: instance.position,
            startPage: instance.startPage,
            endPage: instance.endPage,
            detectionMethod: instance.detectionMethod,
            detectionScore: instance.detectionScore,
            extractedText: instance.extractedText,
            status: instance.status,
          });
        }

        /*
         * -------------------------------------------------------
         * Multi-document review
         *
         * Only documents containing multiple detected instances
         * enter the boundary review stage.
         *
         * A single detected instance follows the existing
         * workflow unchanged.
         * -------------------------------------------------------
         */

        if (instances.length > 1) {
          await db.orm.public.Document
            .where({
              id: document.id,
              userId: user.id,
            })
            .update({
              status: "REVIEW",
            });
        }
      }

      /*
       * ---------------------------------------------------------
       * Classification
       *
       * Classification still happens against the whole uploaded
       * document. Template selection remains one selection for
       * the entire uploaded file.
       * ---------------------------------------------------------
       */

      const suggestions =
        await classifyAndMatchDocument(
          parsedDocument.text
        );

      return NextResponse.json({
        analysisStatus: "SUCCESS",

        document: {
  id: document.id,
  fileName: document.fileName,
  mimeType: document.mimeType,
  status: instances.length > 1 ? "REVIEW" : document.status,
},

        parsed: parsedDocument,

        instances,

        classification: {
          suggestions,
        },
      });
    } catch (error) {
      /*
       * ---------------------------------------------------------
       * Known unsupported format
       * ---------------------------------------------------------
       */

      if (error instanceof UnsupportedDocumentTypeError) {
        await db.orm.public.Document
          .where({ id: document.id })
          .update({
            parseStatus: "UNSUPPORTED",
            parseMessage:
              "This document format cannot currently be analyzed automatically.",
          });

        return NextResponse.json({
          analysisStatus: "UNSUPPORTED",
          message:
            "This document format cannot currently be analyzed automatically.",
          reason: error.message,
          document: {
            id: document.id,
            fileName: document.fileName,
            mimeType: document.mimeType,
          },
        });
      }

      /*
       * ---------------------------------------------------------
       * Unexpected parser error
       * ---------------------------------------------------------
       */

      console.error("Parse document error:", error);

      await db.orm.public.Document
        .where({ id: document.id })
        .update({
          parseStatus: "FAILED",
          parseMessage:
            "The document could not be analyzed automatically.",
        });

      return NextResponse.json({
        analysisStatus: "FAILED",
        message:
          "The document could not be analyzed automatically.",
        document: {
          id: document.id,
          fileName: document.fileName,
          mimeType: document.mimeType,
        },
      });
    }
  } catch (error) {
    console.error("Parse route error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while processing the request",
      },
      { status: 500 }
    );
  }
}