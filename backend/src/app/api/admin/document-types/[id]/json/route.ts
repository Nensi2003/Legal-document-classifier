import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCombinedDocumentTypeJSON } from "@/services/documentTypeService";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { error } = await requireAdmin();

    if (error === "Not authenticated") {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (error === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const documentTypeId = Number(id);

    if (!Number.isInteger(documentTypeId)) {
      return NextResponse.json(
        { error: "Invalid document type ID" },
        { status: 400 }
      );
    }

    const versionParam = new URL(_request.url).searchParams.get("version");
    const versionNumber = versionParam === null ? undefined : Number(versionParam);
    if (versionParam !== null && (!Number.isInteger(versionNumber) || versionNumber! < 1)) {
      return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
    }
    const result = await getCombinedDocumentTypeJSON(documentTypeId, versionNumber);

    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Document type not found"
    ) {
      return NextResponse.json(
        { error: "Document type not found" },
        { status: 404 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
