import { getCurrentUser } from "@/lib/auth";
import { mergeDocumentInstances } from "@/services/documentInstanceService";
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

    const body = await request.json();

    const firstInstanceId = body.firstInstanceId;
    const secondInstanceId = body.secondInstanceId;

    if (
      !Number.isInteger(firstInstanceId) ||
      !Number.isInteger(secondInstanceId)
    ) {
      return NextResponse.json(
        {
          error:
            "firstInstanceId and secondInstanceId must be integers",
        },
        { status: 400 }
      );
    }

    const result = await mergeDocumentInstances(
      documentId,
      firstInstanceId,
      secondInstanceId,
      user.id
    );

    return NextResponse.json({
      message: "Document instances merged successfully",
      instance: result.instance,
    });
  } catch (error) {
    console.error(
      "Merge document instances error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to merge document instances";

    if (
      message === "Document not found" ||
      message === "Document instance not found"
    ) {
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }

    if (
      message ===
      "Document boundaries can only be edited during review"
    ) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    if (
      message === "Cannot merge an instance with itself" ||
      message ===
        "Only adjacent document instances can be merged"
    ) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    if (
      message ===
        "Boundary editing is currently supported only for PDF documents" ||
      message === "Document does not contain page-level text"
    ) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to merge document instances" },
      { status: 500 }
    );
  }
}