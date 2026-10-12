import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { getAccessibleDocumentById } from "@/services/documentAccessService";
import { NextRequest, NextResponse } from "next/server";
import { publishDocumentEvent } from "@/realtime/publisher";
import { assertDocumentClaim } from "@/services/documentClaimService";

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

    const document = await getAccessibleDocumentById(documentId, user.id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    const claim = await assertDocumentClaim(documentId, user.id);
    if (!claim.allowed) return NextResponse.json({ error: claim.error }, { status: claim.status });

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
        .where({ id: documentId })
        .update({
          status: "AVAILABLE",
        });

    if (!updatedDocument) {
      return NextResponse.json(
        { error: "Failed to confirm document boundaries" },
        { status: 500 }
      );
    }

    publishDocumentEvent("DOCUMENT_STATUS_CHANGED", documentId, user.id, { previousStatus: "REVIEW", status: "AVAILABLE" });

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
