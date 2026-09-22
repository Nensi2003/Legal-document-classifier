import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const batchId = Number(id);

    if (!Number.isInteger(batchId)) {
      return NextResponse.json(
        { error: "Invalid batch ID" },
        { status: 400 }
      );
    }

    const batch = await db.orm.public.Batch
      .where({
        id: batchId,
        userId: user.id,
      })
      .first();

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    const documents = await db.orm.public.Document
      .where({
        batchId: batch.id,
        userId: user.id,
      })
      .all();

    return NextResponse.json({
      batch: {
        id: batch.id,
        status: batch.status,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      },

      documents: documents
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        )
        .map((document) => ({
          id: document.id,
          fileName: document.fileName,
          mimeType: document.mimeType,
          status: document.status,
          parseStatus: document.parseStatus,
          parseMessage: document.parseMessage,
          documentTypeId: document.documentTypeId,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        })),
    });
  } catch (error) {
    console.error("Get batch error:", error);

    return NextResponse.json(
      {
        error: "Failed to retrieve batch.",
      },
      { status: 500 }
    );
  }
}