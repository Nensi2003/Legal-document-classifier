import { NextRequest, NextResponse } from "next/server";
import {
  getDocumentTypes,
  createDocumentType,
} from "@/services/documentTypeService";

export async function GET() {
  try {
    const documentTypes = await getDocumentTypes();

    return NextResponse.json(documentTypes);
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

    const { name, domain, description, jsonSchema } = body;

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