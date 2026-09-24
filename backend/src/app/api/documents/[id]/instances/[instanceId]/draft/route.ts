import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
      instanceId: string;
    }>;
  }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id, instanceId } = await context.params;

    const documentId = Number(id);
    const instanceIdNumber = Number(instanceId);

    if (
      !Number.isInteger(documentId) ||
      !Number.isInteger(instanceIdNumber)
    ) {
      return NextResponse.json(
        { error: "Invalid document or instance ID" },
        { status: 400 }
      );
    }

    // Make sure the parent document belongs to the current user.
    const document = await db.orm.public.Document
      .where({
        id: documentId,
        userId: user.id,
      })
      .first();

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Make sure the instance belongs to this document.
    const instance = await db.orm.public.DocumentInstance
      .where({
        id: instanceIdNumber,
        documentId: document.id,
      })
      .first();

    if (!instance) {
      return NextResponse.json(
        { error: "Document instance not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const draftData = body.draftData as JsonValue;

    // Save the instance draft.
    const updatedInstance =
      await db.orm.public.DocumentInstance
        .where({
          id: instanceIdNumber,
          documentId,
        })
        .update({
          draftData,
          status: "DRAFT",
        });

    if (!updatedInstance) {
      return NextResponse.json(
        { error: "Failed to update document instance" },
        { status: 404 }
      );
    }

    // The parent document is also a draft while any instance
    // is being edited. This keeps the Documents/Drafts list
    // consistent with the instance status.
    await db.orm.public.Document
      .where({
        id: documentId,
        userId: user.id,
      })
      .update({
        status: "DRAFT",
      });

    return NextResponse.json({
      instance: {
        id: updatedInstance.id,
        documentId: updatedInstance.documentId,
        position: updatedInstance.position,
        startPage: updatedInstance.startPage,
        endPage: updatedInstance.endPage,
        status: updatedInstance.status,
        draftData: updatedInstance.draftData,
      },
    });
  } catch (error) {
    console.error(
      "Save instance draft error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to save instance draft" },
      { status: 500 }
    );
  }
}
