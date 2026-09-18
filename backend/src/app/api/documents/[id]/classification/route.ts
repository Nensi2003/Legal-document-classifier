import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { classifyAndMatchDocument } from "@/services/classificationService";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
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

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      return Response.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const document =
      await db.orm.public.Document
        .where({
          id: documentId,
          userId: user.id,
        })
        .first();

    if (!document) {
      return Response.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (!document.extractedText) {
      return Response.json({
        suggestions: [],
      });
    }

    const suggestions =
      await classifyAndMatchDocument(
        document.extractedText
      );

    return Response.json({
      suggestions,
    });
  } catch (error) {
    console.error(
      "Classification error:",
      error
    );

    return Response.json(
      {
        error: "Failed to classify document",
      },
      { status: 500 }
    );
  }
}