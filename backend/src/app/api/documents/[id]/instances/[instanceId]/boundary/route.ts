import { getCurrentUser } from "@/lib/auth";
import { updateDocumentInstanceBoundary } from "@/services/documentInstanceService";
import { NextRequest, NextResponse } from "next/server";

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
    // 1. Authenticate the user.
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. Read route parameters.
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

    // 3. Read request body.
    const body = await request.json();

    const startPage = body.startPage;
    const endPage = body.endPage;

    // 4. Validate page numbers.
    if (
      !Number.isInteger(startPage) ||
      !Number.isInteger(endPage)
    ) {
      return NextResponse.json(
        {
          error: "startPage and endPage must be integers",
        },
        { status: 400 }
      );
    }

    if (startPage < 1 || endPage < startPage) {
      return NextResponse.json(
        {
          error: "Invalid page range",
        },
        { status: 400 }
      );
    }

    // 5. Update the instance boundary.
    const instance = await updateDocumentInstanceBoundary(
      documentId,
      instanceIdNumber,
      user.id,
      startPage,
      endPage
    );

    // 6. Return the updated instance.
    return NextResponse.json({
      instance: {
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
      },
    });
  } catch (error) {
    console.error("Update document instance boundary error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update document instance boundary";

        if (
  message ===
  "Document boundaries can only be edited during review"
) {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

    if (message === "Document not found") {
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }

    if (message === "Document instance not found") {
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }

    if (
      message === "Invalid page range" ||
      message.startsWith("Invalid page range.")
    ) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    if (
      message ===
      "Boundary editing is currently supported only for PDF documents"
    ) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    if (message === "Document does not contain page-level text") {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update document instance boundary" },
      { status: 500 }
    );
  }
}