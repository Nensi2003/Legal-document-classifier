import { requireAdmin } from "@/lib/auth";
import { publishDocumentEvent } from "@/realtime/publisher";
import { deleteDocumentAsAdmin } from "@/services/documentService";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error } = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error },
        { status: error === "Not authenticated" ? 401 : 403 },
      );
    }

    const documentId = Number((await params).id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const document = await deleteDocumentAsAdmin(documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    publishDocumentEvent("DOCUMENT_DELETED", documentId, user.id, {
      fileName: document.fileName,
    });

    return NextResponse.json({
      message: "Document deleted successfully",
      document: { id: document.id, fileName: document.fileName },
    });
  } catch (cause) {
    console.error("Admin document deletion error:", cause);
    return NextResponse.json(
      { error: "Something went wrong while deleting the document" },
      { status: 500 },
    );
  }
}
