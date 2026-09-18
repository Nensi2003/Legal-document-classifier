import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { createDocument } from "@/services/documentService";
import { parseDocument } from "@/parsers/documentParser";
import { classifyAndMatchDocument } from "@/services/classificationService";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_BATCH_SIZE = 100;

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // 2. Get uploaded files
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (files.length === 0) {
      return NextResponse.json(
        {
          error: "No files provided",
        },
        { status: 400 }
      );
    }

    // 3. Validate batch size
    if (files.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `You can upload a maximum of ${MAX_BATCH_SIZE} files at once.`,
        },
        { status: 400 }
      );
    }

    // 4. Create uploads directory
    const uploadDirectory = path.join(
      process.cwd(),
      "uploads"
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const results = [];

    // 5. Process each file
    for (const item of files) {
      if (!(item instanceof File)) {
        results.push({
          fileName: "Unknown",
          success: false,
          status: "FAILED",
          error: "Invalid file.",
        });

        continue;
      }

      const file = item;

      // 6. Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({
          fileName: file.name,
          success: false,
          status: "UNSUPPORTED",
          error: "Unsupported file type.",
        });

        continue;
      }

      // 7. Validate file size
      if (file.size > MAX_FILE_SIZE) {
        results.push({
          fileName: file.name,
          success: false,
          status: "FAILED",
          error: "File size must not exceed 10 MB.",
        });

        continue;
      }

      try {
        // 8. Generate unique filename
        const fileExtension =
          path.extname(file.name);

        const uniqueFileName =
          `${randomUUID()}${fileExtension}`;

        const filePath = path.join(
          uploadDirectory,
          uniqueFileName
        );

        // 9. Save file
        const bytes =
          await file.arrayBuffer();

        const buffer =
          Buffer.from(bytes);

        await writeFile(
          filePath,
          buffer
        );

        // 10. Create Document record
        const document =
          await createDocument({
            fileName: file.name,
            filePath,
            mimeType: file.type,
            userId: user.id,
          });

        // 11. Parse document
        const parsed =
          await parseDocument(
            filePath,
            file.type
          );

        // 12. Save extracted text
        await db.orm.public.Document
          .where({
            id: document.id,
            userId: user.id,
          })
          .update({
            extractedText: parsed.text,
            parseStatus: "SUCCESS",
            parseMessage: null,
          });

        // 13. Classify document
        const suggestions =
          await classifyAndMatchDocument(
            parsed.text
          );

        results.push({
          document: {
            id: document.id,
            fileName: document.fileName,
            mimeType: document.mimeType,
            status: "PENDING",
            parseStatus: "SUCCESS",
          },
          success: true,
          status: "READY",
          suggestions,
        });
      } catch (error) {
        console.error(
          `Failed to process ${file.name}:`,
          error
        );

        results.push({
          fileName: file.name,
          success: false,
          status: "FAILED",
          error:
            "The document could not be processed.",
        });
      }
    }

    // 14. Return batch results
    const successful =
      results.filter(
        (result) => result.success
      ).length;

    const failed =
      results.filter(
        (result) => !result.success
      ).length;

    return NextResponse.json(
      {
        message:
          "Batch upload completed.",
        total: files.length,
        successful,
        failed,
        results,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Batch upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while processing the batch.",
      },
      { status: 500 }
    );
  }
}