import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleDocumentById } from "@/services/documentAccessService";
import { claimDocument, DocumentClaimConflictError, releaseDocumentClaim } from "@/services/documentClaimService";
import { forgetRealtimeUserClaim, publishDocumentEvent } from "@/realtime/publisher";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  if (!await getAccessibleDocumentById(id, user.id)) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  try {
    await claimDocument(id, user.id);
    publishDocumentEvent("DOCUMENT_CLAIMED", id, user.id, { userName: user.name });
    return NextResponse.json({ claimed: true, userId: user.id, userName: user.name });
  } catch (error) {
    if (error instanceof DocumentClaimConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Claim document error:", error);
    return NextResponse.json({ error: "Failed to claim document" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  const released = await releaseDocumentClaim(id, user.id);
  if (released) {
    forgetRealtimeUserClaim(user.id, id);
    publishDocumentEvent("DOCUMENT_RELEASED", id, user.id, { userName: user.name });
  }
  return NextResponse.json({ released: Boolean(released) });
}
