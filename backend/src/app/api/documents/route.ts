import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { createDocument } from "@/services/documentService";
import { getDocumentsAccessibleToUser } from "@/services/documentAccessService";
import { publishAvailableEvent } from "@/realtime/publisher";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    // 2. Get uploaded file
    const formData = await request.formData();
    const file = formData.get("file");
    const requestedTypeId = formData.get("documentTypeId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "No file provided",
        },
        { status: 400 }
      );
    }

    // 3. Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Unsupported file type",
        },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File size must not exceed 10 MB",
        },
        { status: 400 }
      );
    }

    // 5. Create uploads directory if it doesn't exist
    const uploadDirectory = path.join(
      process.cwd(),
      "uploads"
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    // 6. Generate a unique filename
    const fileExtension = path.extname(file.name);

    const uniqueFileName =
      `${randomUUID()}${fileExtension}`;

    // 7. Create the actual filesystem path
    const filePath = path.join(
      uploadDirectory,
      uniqueFileName
    );

    // 8. Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 9. Save the physical file
    await writeFile(filePath, buffer);

    // 10. Store a portable relative path in the database
    const storedFilePath = path.posix.join(
      "uploads",
      uniqueFileName
    );

    let documentTypeId: number | undefined;
    let documentTypeVersionId: number | undefined;
    if (requestedTypeId) {
      documentTypeId = Number(requestedTypeId);
      if (!Number.isInteger(documentTypeId) || documentTypeId <= 0) {
        return NextResponse.json({ error: "Invalid document type ID" }, { status: 400 });
      }
      const activeVersion = await db.orm.public.DocumentTypeVersion
        .where({ documentTypeId, status: "ACTIVE" }).first();
      if (!activeVersion) {
        return NextResponse.json({ error: "Document type has no active version" }, { status: 400 });
      }
      documentTypeVersionId = activeVersion.id;
    }

    // 11. Save document metadata, retaining the active template version if selected.
    const document = await createDocument({
      fileName: file.name,
      filePath: storedFilePath,
      mimeType: file.type,
      userId: user.id,
      documentTypeId,
      documentTypeVersionId,
      status: "DRAFT",
    });

    publishAvailableEvent(document.id, user.id, {
      fileName: document.fileName,
      status: "DRAFT",
      createdAt: document.createdAt,
    });

    return NextResponse.json(
      {
        message: "Document uploaded successfully",
        document: {
          id: document.id,
          fileName: document.fileName,
          mimeType: document.mimeType,
          status: document.status,
          createdAt: document.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while uploading the document",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
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

    // All documents are visible to authenticated processing users.
    const documents = await getDocumentsAccessibleToUser(user.id);

    // 3. Get document types
    const documentTypes =
      await db.orm.public.DocumentType.all();

    // 4. Attach document type name
    const documentsWithType = documents.map(
      (document) => {
        const documentType = documentTypes.find(
          (type) =>
            type.id === document.documentTypeId
        );

        return {
          ...document,
          documentTypeName:
            documentType?.name ?? null,
        };
      }
    );

    return NextResponse.json({
      documents: documentsWithType,
    });
  } catch (error) {
    console.error("Get documents error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while retrieving documents",
      },
      { status: 500 }
    );
  }
}
