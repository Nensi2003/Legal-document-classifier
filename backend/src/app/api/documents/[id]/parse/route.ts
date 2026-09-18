import { classifyAndMatchDocument } from "@/services/classificationService";
import { getCurrentUser } from "@/lib/auth";
import { parseDocument } from "@/parsers/documentParser";
import { UnsupportedDocumentTypeError } from "@/parsers/parserErrors";
import { db } from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";

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
      const parsedDocument = await parseDocument(
        document.filePath,
        document.mimeType
      );

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

     const suggestions = await classifyAndMatchDocument(parsedDocument.text);

      await db.orm.public.Document
        .where({ id: document.id })
        .update({
          extractedText: parsedDocument.text,
          parseStatus: "SUCCESS",
          parseMessage: null,
        });

      return NextResponse.json({
        analysisStatus: "SUCCESS",

        document: {
          id: document.id,
          fileName: document.fileName,
          mimeType: document.mimeType,
        },

        parsed: parsedDocument,

        classification: {
          suggestions,
        },
      });
    } catch (error) {
      // Known unsupported format
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

      // Unexpected parser error
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
        error: "Something went wrong while processing the request",
      },
      { status: 500 }
    );
  }
}