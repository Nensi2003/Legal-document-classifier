import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { parse } from "csv-parse/sync";
import sanitizeHtml from "sanitize-html";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";

import { withConvertedDocx } from "@/parsers/docConverter";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    /*
     * ---------------------------------------------------------
     * Authentication
     * ---------------------------------------------------------
     */
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        {
          status: 401,
        }
      );
    }


    /*
     * ---------------------------------------------------------
     * Get document ID
     * ---------------------------------------------------------
     */
    const { id } = await context.params;

    const documentId = Number(id);

    if (!Number.isInteger(documentId)) {
      return NextResponse.json(
        {
          error: "Invalid document ID",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * ---------------------------------------------------------
     * Get document
     *
     * IMPORTANT:
     * We check userId so one user cannot preview
     * another user's document.
     * ---------------------------------------------------------
     */
    const document =
      await db.orm.public.Document
        .where({
          id: documentId,
          userId: user.id,
        })
        .first();

    if (!document) {
      return NextResponse.json(
        {
          error: "Document not found",
        },
        {
          status: 404,
        }
      );
    }


    /*
     * ---------------------------------------------------------
     * DOCX
     * ---------------------------------------------------------
     */
    if (
  document.mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  document.mimeType === "application/msword"
) {
  const result =
    document.mimeType === "application/msword"
      ? await withConvertedDocx(
          document.filePath,
          (docxPath) =>
            mammoth.convertToHtml({
              path: docxPath,
            })
        )
      : await mammoth.convertToHtml({
          path: document.filePath,
        });

  const html = sanitizeHtml(result.value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      "*": ["class"],
    },
  });

  return NextResponse.json({
    type: "docx",
    html,
    messages: result.messages,
  });
}


    /*
     * ---------------------------------------------------------
     * CSV
     * ---------------------------------------------------------
     */
    if (document.mimeType === "text/csv") {
      const fileBuffer =
        await readFile(document.filePath);

      const fileContent =
        fileBuffer.toString("utf-8");

      const rows = parse(
        fileContent,
        {
          skip_empty_lines: true,
          relax_column_count: true,
        }
      ) as unknown[][];

      return NextResponse.json({
        type: "csv",
        rows,
      });
    }


    /*
     * ---------------------------------------------------------
     * Unsupported preview type
     * ---------------------------------------------------------
     */
    return NextResponse.json(
      {
        error:
          "Preview is not available for this document type.",
      },
      {
        status: 400,
      }
    );

  } catch (error) {
    console.error(
      "Document preview error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the document preview.",
      },
      {
        status: 500,
      }
    );
  }
}