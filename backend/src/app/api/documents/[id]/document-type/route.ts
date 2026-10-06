import { getCurrentUser } from "@/lib/auth";
import { assignDocumentType } from "@/services/documentService";
import { getDocumentTypeById } from "@/services/documentTypeService";
import { db } from "@/prisma/db";
import { getAccessibleDocumentById } from "@/services/documentAccessService";
import { NextRequest, NextResponse } from "next/server";
import { publishDocumentEvent } from "@/realtime/publisher";
import { assertDocumentClaim } from "@/services/documentClaimService";

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

    const document = await getAccessibleDocumentById(documentId, user.id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    const claim = await assertDocumentClaim(documentId, user.id);
    if (!claim.allowed) return NextResponse.json({ error: claim.error }, { status: claim.status });

    const documentType = await getDocumentTypeById(documentTypeId);

    if (!documentType) {
      return NextResponse.json(
        { error: "Document type not found" },
        { status: 404 }
      );
    }

    const assigned = await assignDocumentType(
      documentId,
      user.id,
      documentTypeId
    );
    if (!assigned) {
      return NextResponse.json({ error: "Document type assignment failed" }, { status: 404 });
    }

    publishDocumentEvent("DOCUMENT_UPDATED", documentId, user.id, { documentTypeId, documentTypeVersionId: assigned.documentTypeVersionId });

    return NextResponse.json({
      message: "Document type assigned successfully",
      documentId,
      documentTypeId,
      documentTypeVersionId: assigned.documentTypeVersionId,
    });
  } catch (error) {
    console.error("Error assigning document type:", error);

    return NextResponse.json(
      { error: "Failed to assign document type" },
      { status: 500 }
    );
  }
}
