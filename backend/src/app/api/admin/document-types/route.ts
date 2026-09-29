import { requireAdmin } from "@/lib/auth";
import { db } from "@/prisma/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();

    const documentTypes =
      await db.orm.public.DocumentType.all();

    return NextResponse.json({
      documentTypes: documentTypes.map((documentType) => ({
        id: documentType.id,
        name: documentType.name,
        domain: documentType.domain,
        description: documentType.description,
        createdAt: documentType.createdAt,
        updatedAt: documentType.updatedAt,
      })),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}