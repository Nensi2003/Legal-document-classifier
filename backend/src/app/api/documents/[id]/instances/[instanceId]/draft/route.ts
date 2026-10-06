import { getCurrentUser } from "@/lib/auth";
import { getAccessibleDocumentById } from "@/services/documentAccessService";
import { db } from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import { publishDocumentEvent } from "@/realtime/publisher";
import { assertDocumentClaim } from "@/services/documentClaimService";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
      instanceId: string;
    }>;
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

    const { id, instanceId } = await context.params;

    const documentId = Number(id);
    const instanceIdNumber = Number(instanceId);

    if (
      !Number.isInteger(documentId) ||
      !Number.isInteger(instanceIdNumber)
    ) {
      return NextResponse.json(
        { error: "Invalid document or instance ID" },
        { status: 400 }
      );
    }

    // Make sure the parent document belongs to the current user.
    const document = await getAccessibleDocumentById(documentId, user.id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const claim = await assertDocumentClaim(documentId, user.id);
    if (!claim.allowed) return NextResponse.json({ error: claim.error }, { status: claim.status });

    // Make sure the instance belongs to this document.
    const instance = await db.orm.public.DocumentInstance
      .where({
        id: instanceIdNumber,
        documentId: document.id,
      })
      .first();

    if (!instance) {
      return NextResponse.json(
        { error: "Document instance not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    if (typeof body.expectedUpdatedAt !== "string") {
      return NextResponse.json({ error: "expectedUpdatedAt is required" }, { status: 400 });
    }
    const draftData = body.draftData as JsonValue;

    // Compare-and-swap the shared parent revision before saving the instance.
    const updatedDocument = await db.orm.public.Document
      .where({ id: documentId, updatedAt: body.expectedUpdatedAt, activeWorkerId: user.id, claimExpiresAt: document.claimExpiresAt })
      .update({ status: "DRAFT" });
    if (!updatedDocument) {
      return NextResponse.json({ error: "This document changed in another session. Reload it before saving again." }, { status: 409 });
    }

    // Save the instance draft.
    const updatedInstance =
      await db.orm.public.DocumentInstance
        .where({
          id: instanceIdNumber,
          documentId,
        })
        .update({
          draftData,
          status: "DRAFT",
        });

    if (!updatedInstance) {
      return NextResponse.json(
        { error: "Failed to update document instance" },
        { status: 404 }
      );
    }

    publishDocumentEvent("DOCUMENT_UPDATED", documentId, user.id, {
      status: "DRAFT",
      instanceId: instanceIdNumber,
    });
    if (document.status !== "DRAFT") {
      publishDocumentEvent("DOCUMENT_STATUS_CHANGED", documentId, user.id, { previousStatus: document.status, status: "DRAFT" });
    }

    return NextResponse.json({
      instance: {
        id: updatedInstance.id,
        documentId: updatedInstance.documentId,
        position: updatedInstance.position,
        startPage: updatedInstance.startPage,
        endPage: updatedInstance.endPage,
        status: updatedInstance.status,
        draftData: updatedInstance.draftData,
        updatedAt: updatedInstance.updatedAt,
      },
      documentUpdatedAt: updatedDocument.updatedAt,
    });
  } catch (error) {
    console.error(
      "Save instance draft error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to save instance draft" },
      { status: 500 }
    );
  }
}
