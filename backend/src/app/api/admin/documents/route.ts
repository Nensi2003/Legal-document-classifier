import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const documents =
      await db.orm.public.Document.all();

    const users =
      await db.orm.public.User.all();

    const documentTypes =
      await db.orm.public.DocumentType.all();

    const documentsWithDetails = documents.map(
      (document) => {
        const documentUser = users.find(
          (user) => user.id === document.userId
        );

        const documentType =
          documentTypes.find(
            (type) =>
              type.id === document.documentTypeId
          );

        return {
          id: document.id,
          fileName: document.fileName,
          mimeType: document.mimeType,
          status: document.status,
          createdAt: document.createdAt,
          userId: document.userId,
          userName: documentUser?.name ?? null,
          userEmail: documentUser?.email ?? null,
          documentTypeName:
            documentType?.name ?? null,
        };
      }
    );

    return NextResponse.json({
      documents: documentsWithDetails,
    });
  } catch (error) {
    console.error(
      "Admin documents error:",
      error
    );

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}