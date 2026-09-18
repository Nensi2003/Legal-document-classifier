import { getCurrentUser } from "@/lib/auth";
import { generateJSON } from "@/services/jsonService";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const documentId = Number(id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      return Response.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || body.data === undefined) {
      return Response.json(
        { error: "Document data is required" },
        { status: 400 }
      );
    }

    const result = await generateJSON(
      documentId,
      user.id,
      body.data
    );

    if (!result.valid) {
      return Response.json(
        {
          valid: false,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        valid: true,
        generatedJSON: result.generatedJSON,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Generate JSON error:", error);

    return Response.json(
      { error: "Failed to generate JSON" },
      { status: 500 }
    );
  }
}