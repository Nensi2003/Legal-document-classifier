import { getDocumentTypeById } from "@/services/documentTypeService";
import {
  getFieldsByDocumentType,
  createField,
} from "@/services/fieldService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    const fields = await getFieldsByDocumentType(documentTypeId);

    return NextResponse.json(fields);
  } catch (error) {
    console.error("Error fetching fields:", error);

    return NextResponse.json(
      { error: "Failed to fetch fields" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    const body = await request.json();

    const { name, type, required, validationRule } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    const field = await createField({
      name,
      type,
      required,
      validationRule,
      documentTypeId,
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error("Error creating field:", error);

    return NextResponse.json(
      { error: "Failed to create field" },
      { status: 500 }
    );
  }
}