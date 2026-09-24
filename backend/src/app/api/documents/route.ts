import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { createDocument } from "@/services/documentService";

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

    // 11. Save document metadata
    const document = await createDocument({
      fileName: file.name,
      filePath: storedFilePath,
      mimeType: file.type,
      userId: user.id,
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

    // 2. Get documents belonging to the current user
    const documents = await db.orm.public.Document
      .where({ userId: user.id })
      .all();

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