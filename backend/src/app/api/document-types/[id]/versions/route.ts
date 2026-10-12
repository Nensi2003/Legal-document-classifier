import { NextRequest, NextResponse } from "next/server";
import { createDocumentTypeDraft, getDocumentTypeById, getDocumentTypeVersions } from "@/services/documentTypeService";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const typeId = Number(id);
  if (!Number.isInteger(typeId)) return NextResponse.json({ error: "Invalid document type ID" }, { status: 400 });
  if (!await getDocumentTypeById(typeId)) return NextResponse.json({ error: "Document type not found" }, { status: 404 });
  return NextResponse.json(await getDocumentTypeVersions(typeId));
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const typeId = Number(id);
  if (!Number.isInteger(typeId)) return NextResponse.json({ error: "Invalid document type ID" }, { status: 400 });
  if (!await getDocumentTypeById(typeId)) return NextResponse.json({ error: "Document type not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(await createDocumentTypeDraft(typeId, body.jsonSchema), { status: 201 });
}
