import { getCurrentUser } from "@/lib/auth";
import { assignDocumentType } from "@/services/documentService";
import { getDocumentTypeById } from "@/services/documentTypeService";
import { db } from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
  });
}

export async function PATCH(
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

    const body = await request.json();
    const documentTypeId = Number(body.documentTypeId);

    if (!Number.isInteger(documentTypeId)) {
      return NextResponse.json(
        { error: "Invalid document type ID" },
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

    const documentType = await getDocumentTypeById(documentTypeId);

    if (!documentType) {
      return NextResponse.json(
        { error: "Document type not found" },
        { status: 404 }
      );
    }

    await assignDocumentType(
      documentId,
      user.id,
      documentTypeId
    );

    return NextResponse.json({
      message: "Document type assigned successfully",
      documentId,
      documentTypeId,
    });
  } catch (error) {
    console.error("Error assigning document type:", error);

    return NextResponse.json(
      { error: "Failed to assign document type" },
      { status: 500 }
    );
  }
}