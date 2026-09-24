import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
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

    const instances = await db.orm.public.DocumentInstance
      .where({
        documentId,
      })
      .all();

    return NextResponse.json({
      instances: instances.map((instance) => ({
        id: instance.id,
        documentId: instance.documentId,
        position: instance.position,
        startPage: instance.startPage,
        endPage: instance.endPage,
        detectionMethod: instance.detectionMethod,
        detectionScore: instance.detectionScore,
        extractedText: instance.extractedText,
        status: instance.status,
        draftData: instance.draftData,
        generatedJSON: instance.generatedJSON,
      })),
    });
  } catch (error) {
    console.error("Get document instances error:", error);

    return NextResponse.json(
      { error: "Failed to get document instances" },
      { status: 500 }
    );
  }
}