import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { createDocument } from "@/services/documentService";
import { parseDocument } from "@/parsers/documentParser";
import { classifyAndMatchDocument } from "@/services/classificationService";
import { publishAvailableEvent } from "@/realtime/publisher";

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

    let selectedTypeId: number | undefined;
    let selectedVersionId: number | undefined;
    const requestedTypeId = formData.get("documentTypeId");
    if (requestedTypeId) {
      selectedTypeId = Number(requestedTypeId);
      if (!Number.isInteger(selectedTypeId) || selectedTypeId <= 0) {
        return NextResponse.json({ error: "Invalid document type ID" }, { status: 400 });
      }
      const activeVersion = await db.orm.public.DocumentTypeVersion
        .where({ documentTypeId: selectedTypeId, status: "ACTIVE" }).first();
      if (!activeVersion) {
        return NextResponse.json({ error: "Document type has no active version" }, { status: 400 });
      }
      selectedVersionId = activeVersion.id;
    }

    const batch = await db.orm.public.Batch.create({
      userId: user.id,
      status: "ACTIVE",
    });

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

      let uploadedDocumentId: number | null = null;
      let uploadedFileName: string | null = null;
      let uploadedAt: Date | string | null = null;
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
        const document = await createDocument({
  fileName: file.name,
  filePath,
  mimeType: file.type,
  userId: user.id,
  batchId: batch.id,
  documentTypeId: selectedTypeId,
  documentTypeVersionId: selectedVersionId,
  status: "AVAILABLE",
});
        uploadedDocumentId = document.id;
        uploadedFileName = document.fileName;
        uploadedAt = document.createdAt;

        if (user.role === "ADMIN") {
          publishAvailableEvent(document.id, user.id, {
            fileName: document.fileName,
            status: "AVAILABLE",
            createdAt: document.createdAt,
            batchId: batch.id,
          });
          results.push({
            document: {
              id: document.id,
              fileName: document.fileName,
              mimeType: document.mimeType,
              status: "AVAILABLE",
              parseStatus: document.parseStatus,
            },
            success: true,
            status: "AVAILABLE",
            batchId: batch.id,
          });
          continue;
        }

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
    status: "AVAILABLE",
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
    status: "AVAILABLE",
    parseStatus: "SUCCESS",
  },
  success: true,
  status: "AVAILABLE",
  batchId: batch.id,
  suggestions,
});
        publishAvailableEvent(document.id, user.id, {
          fileName: document.fileName,
          status: "AVAILABLE",
          createdAt: document.createdAt,
          batchId: batch.id,
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
        if (uploadedDocumentId !== null) {
          publishAvailableEvent(uploadedDocumentId, user.id, {
            fileName: uploadedFileName,
            status: "AVAILABLE",
            createdAt: uploadedAt,
            batchId: batch.id,
          });
        }
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
        message: "Batch documents are available for users to process.",
        batchId: batch.id,
        total: files.length,
        successful,
        failed,
        results,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Batch upload error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while processing the batch.",
      },
      { status: 500 }
    );
  }
}
