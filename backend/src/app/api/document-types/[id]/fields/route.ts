import { getDocumentTypeById, getDocumentTypeVersions } from "@/services/documentTypeService";
import {
  getFieldsByDocumentType,
  getFieldsByVersion,
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

    const versionId = Number(new URL(request.url).searchParams.get("versionId"));
    if (Number.isInteger(versionId) && versionId > 0) {
      const versions = await getDocumentTypeVersions(documentTypeId);
      if (!versions.some((version) => version.id === versionId)) return NextResponse.json({ error: "Document type version not found" }, { status: 404 });
    }
    const fields = Number.isInteger(versionId) && versionId > 0
      ? await getFieldsByVersion(versionId)
      : await getFieldsByDocumentType(documentTypeId);

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

    const versionId = Number(new URL(request.url).searchParams.get("versionId"));
    if (!Number.isInteger(versionId) || versionId <= 0) {
      return NextResponse.json({ error: "versionId is required; create a draft version before editing fields" }, { status: 400 });
    }
    const versions = await getDocumentTypeVersions(documentTypeId);
    if (!versions.some((version) => version.id === versionId)) return NextResponse.json({ error: "Document type version not found" }, { status: 404 });
    const field = await createField({
      name,
      type,
      required,
      validationRule,
      documentTypeVersionId: versionId,
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error("Error creating field:", error);

    if (
      error instanceof Error &&
      error.message ===
        "A field with this name already exists in this template"
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create field" },
      { status: 500 }
    );
  }
}
