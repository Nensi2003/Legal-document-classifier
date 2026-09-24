import { getCurrentUser } from "@/lib/auth";
import { generateInstanceJSON } from "@/services/jsonService";

interface RouteContext {
  params: Promise<{
    id: string;
    instanceId: string;
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

    const { id, instanceId } = await context.params;

    const documentId = Number(id);
    const documentInstanceId = Number(instanceId);

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      return Response.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(documentInstanceId) ||
      documentInstanceId <= 0
    ) {
      return Response.json(
        { error: "Invalid document instance ID" },
        { status: 400 }
      );
    }

    const result = await generateInstanceJSON(
      documentId,
      documentInstanceId,
      user.id
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
        instance: result.instance,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Generate instance JSON error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate instance JSON";

    if (
      message === "Document not found" ||
      message === "Document instance not found" ||
      message === "Document type has not been selected" ||
      message === "Document type not found" ||
      message ===
        "Document instance has no data to generate JSON from"
    ) {
      return Response.json(
        { error: message },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Failed to generate instance JSON" },
      { status: 500 }
    );
  }
}