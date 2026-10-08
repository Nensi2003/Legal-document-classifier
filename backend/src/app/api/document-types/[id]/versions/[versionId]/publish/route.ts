import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publishDocumentTypeVersion } from "@/services/documentTypeService";

export async function POST(_request: Request, context: { params: Promise<{ id: string; versionId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id, versionId } = await context.params;
  const typeId = Number(id), version = Number(versionId);
  if (!Number.isInteger(typeId) || !Number.isInteger(version)) return NextResponse.json({ error: "Invalid document type or version ID" }, { status: 400 });
  try { return NextResponse.json(await publishDocumentTypeVersion(typeId, version)); }
  catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish version";
    if (message.includes("not found")) return NextResponse.json({ error: message }, { status: 404 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
