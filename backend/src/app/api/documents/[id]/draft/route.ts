import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const documentId = Number(id);

    if (!Number.isInteger(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      body.draftData === undefined
    ) {
      return NextResponse.json(
        { error: "draftData is required" },
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

    const updatedDocument = await db.orm.public.Document
      .where({
        id: documentId,
        userId: user.id,
      })
      .update({
        draftData: body.draftData,
        status: "DRAFT",
      });

    return NextResponse.json({
      message: "Draft saved successfully",
      documentId,
      status: "DRAFT",
      draftData: body.draftData,
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Error saving draft:", error);

    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    return NextResponse.json({
      documentId: document.id,
      status: document.status,
      draftData: document.draftData,
    });
  } catch (error) {
    console.error("Error getting draft:", error);

    return NextResponse.json(
      { error: "Failed to get draft" },
      { status: 500 }
    );
  }
}
