import { getCurrentUser } from "@/lib/auth";
import { splitDocumentInstance } from "@/services/documentInstanceService";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
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

    const body = await request.json();
    const splitPage = body.splitPage;

    if (!Number.isInteger(splitPage)) {
      return NextResponse.json(
        { error: "splitPage must be an integer" },
        { status: 400 }
      );
    }

    const result = await splitDocumentInstance(
      documentId,
      instanceIdNumber,
      user.id,
      splitPage
    );

    return NextResponse.json({
      message: "Document instance split successfully",
      instances: [
        result.firstInstance,
        result.secondInstance,
      ],
    });
  } catch (error) {
    console.error(
      "Split document instance error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to split document instance";

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
      message === "Invalid split page" ||
      message ===
        "Split page must be inside the document instance range"
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
      { error: "Failed to split document instance" },
      { status: 500 }
    );
  }
}