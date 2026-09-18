import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { deleteDocument } from "@/services/documentService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // 2. Get document ID from URL
    const { id } = await context.params;
    const documentId = Number(id);

    if (!Number.isInteger(documentId)) {
      return NextResponse.json(
        {
          error: "Invalid document ID",
        },
        { status: 400 }
      );
    }

    // 3. Find document belonging to current user
    const document = await db.orm.public.Document
      .where({
        id: documentId,
        userId: user.id,
      })
      .first();

    // 4. Document doesn't exist or doesn't belong to user
    if (!document) {
      return NextResponse.json(
        {
          error: "Document not found",
        },
        { status: 404 }
      );
    }

    // 5. Return document
    return NextResponse.json({
      document,
    });
  } catch (error) {
    console.error("Get document error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while retrieving the document",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const document = await deleteDocument(
      documentId,
      user.id
    );

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Document deleted successfully",
      document: {
        id: document.id,
        fileName: document.fileName,
      },
    });
  } catch (error) {
    console.error("Delete document error:", error);

    return NextResponse.json(
      { error: "Something went wrong while deleting the document" },
      { status: 500 }
    );
  }
}