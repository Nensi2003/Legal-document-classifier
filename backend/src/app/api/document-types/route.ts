import { NextRequest, NextResponse } from "next/server";
import {
  getDocumentTypes,
  createDocumentType,
  getDocumentTypeVersions,
} from "@/services/documentTypeService";
import { getActiveDocumentTypeVersion } from "@/services/documentTypeService";

export async function GET() {
  try {
    const documentTypes = await getDocumentTypes();
    return NextResponse.json(await Promise.all(documentTypes.map(async (documentType) => {
      const versions = await getDocumentTypeVersions(documentType.id);
      const activeVersion = versions.find((version) => version.status === "ACTIVE") ?? await getActiveDocumentTypeVersion(documentType.id);
      const draftVersion = versions.filter((version) => version.status === "DRAFT").at(-1) ?? null;
      return {
        ...documentType,
        activeVersion: activeVersion ? {
          id: activeVersion.id,
          versionNumber: activeVersion.versionNumber,
          status: activeVersion.status,
        } : null,
        draftVersion: draftVersion ? { id: draftVersion.id, versionNumber: draftVersion.versionNumber, status: draftVersion.status } : null,
        versions: versions.map((version) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          status: version.status,
          createdAt: version.createdAt,
          publishedAt: version.publishedAt,
        })),
      };
    })));
  } catch (error) {
    console.error("Error fetching document types:", error);

    return NextResponse.json(
      { error: "Failed to fetch document types" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, domain, description, jsonSchema, fields } = body;

    if (!name || !domain || !jsonSchema) {
      return NextResponse.json(
        {
          error: "name, domain and jsonSchema are required",
        },
        { status: 400 }
      );
    }

    const documentType = await createDocumentType({
      name,
      domain,
      description,
      jsonSchema,
      fields,
      status: "DRAFT",
    });

    return NextResponse.json(documentType, { status: 201 });
  } catch (error) {
    console.error("Error creating document type:", error);

    return NextResponse.json(
      { error: "Failed to create document type" },
      { status: 500 }
    );
  }
}
