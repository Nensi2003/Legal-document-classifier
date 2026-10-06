import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { getAccessibleDocumentById } from "@/services/documentAccessService";
import { publishDocumentEvent } from "@/realtime/publisher";
import { assertDocumentClaim } from "@/services/documentClaimService";

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
      body.draftData === undefined ||
      typeof body.expectedUpdatedAt !== "string"
    ) {
      return NextResponse.json(
        { error: "draftData and expectedUpdatedAt are required" },
        { status: 400 }
      );
    }

    const document = await getAccessibleDocumentById(documentId, user.id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const claim = await assertDocumentClaim(documentId, user.id);
    if (!claim.allowed) return NextResponse.json({ error: claim.error }, { status: claim.status });

    const updatedDocument = await db.orm.public.Document
      .where({ id: documentId, updatedAt: body.expectedUpdatedAt, activeWorkerId: user.id, claimExpiresAt: document.claimExpiresAt })
      .update({
        draftData: body.draftData,
        status: "DRAFT",
      });

    if (!updatedDocument) return NextResponse.json({ error: "This document changed in another session. Reload it before saving again." }, { status: 409 });
    publishDocumentEvent("DOCUMENT_UPDATED", documentId, user.id, { status: "DRAFT" });
    if (document.status !== "DRAFT") {
      publishDocumentEvent("DOCUMENT_STATUS_CHANGED", documentId, user.id, { previousStatus: document.status, status: "DRAFT" });
    }

    return NextResponse.json({
      message: "Draft saved successfully",
      documentId,
      status: "DRAFT",
      draftData: body.draftData,
      updatedAt: updatedDocument.updatedAt,
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

    const document = await getAccessibleDocumentById(documentId, user.id);

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
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error("Error getting draft:", error);

    return NextResponse.json(
      { error: "Failed to get draft" },
      { status: 500 }
    );
  }
}
