import {
    deleteDocumentType,
    getDocumentTypeById,
    updateDocumentType,
} from "@/services/documentTypeService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentTypeId = Number(id);

    if (!Number.isInteger(documentTypeId)) {
      return NextResponse.json(
        { error: "Invalid document type ID" },
        { status: 400 }
      );
    }

    const documentType = await getDocumentTypeById(documentTypeId);

    if (!documentType) {
      return NextResponse.json(
        { error: "Document type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(documentType);
  } catch (error) {
    console.error("Error fetching document type:", error);

    return NextResponse.json(
      { error: "Failed to fetch document type" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentTypeId = Number(id);

    if (!Number.isInteger(documentTypeId)) {
      return NextResponse.json(
        { error: "Invalid document type ID" },
        { status: 400 }
      );
    }

    const existingDocumentType =
      await getDocumentTypeById(documentTypeId);

    if (!existingDocumentType) {
      return NextResponse.json(
        { error: "Document type not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const updatedDocumentType = await updateDocumentType(
      documentTypeId,
      {
        name: body.name,
        domain: body.domain,
        description: body.description,
        jsonSchema: body.jsonSchema,
      }
    );

    return NextResponse.json(updatedDocumentType);
  } catch (error) {
    console.error("Error updating document type:", error);

    return NextResponse.json(
      { error: "Failed to update document type" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentTypeId = Number(id);

    if (!Number.isInteger(documentTypeId)) {
      return NextResponse.json(
        { error: "Invalid document type ID" },
        { status: 400 }
      );
    }

    const existingDocumentType =
      await getDocumentTypeById(documentTypeId);

    if (!existingDocumentType) {
      return NextResponse.json(
        { error: "Document type not found" },
        { status: 404 }
      );
    }

    await deleteDocumentType(documentTypeId);

    return NextResponse.json({
      message: "Document type deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document type:", error);

    return NextResponse.json(
      { error: "Failed to delete document type" },
      { status: 500 }
    );
  }
}