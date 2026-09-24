import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
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

    const document =
      await db.orm.public.Document
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

    if (document.status !== "REVIEW") {
      return NextResponse.json(
        {
          error:
            "Document is not currently in boundary review",
        },
        { status: 400 }
      );
    }

    const instances =
      await db.orm.public.DocumentInstance
        .where({
          documentId,
        })
        .all();

    if (instances.length <= 1) {
      return NextResponse.json(
        {
          error:
            "Boundary review is only required for documents with multiple instances",
        },
        { status: 400 }
      );
    }

    const updatedDocument =
      await db.orm.public.Document
        .where({
          id: documentId,
          userId: user.id,
        })
        .update({
          status: "DRAFT",
        });

    if (!updatedDocument) {
      return NextResponse.json(
        { error: "Failed to confirm document boundaries" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Document boundaries confirmed",
      document: {
        id: updatedDocument.id,
        status: updatedDocument.status,
      },
      instances,
    });
  } catch (error) {
    console.error(
      "Confirm document boundaries error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to confirm document boundaries" },
      { status: 500 }
    );
  }
}