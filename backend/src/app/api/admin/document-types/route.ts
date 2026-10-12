import { requireAdmin } from "@/lib/auth";
import { db } from "@/prisma/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();

    const documentTypes = await db.orm.public.DocumentType.all();

    return NextResponse.json({
      documentTypes: await Promise.all(documentTypes.map(async (documentType) => {
        const versions = await db.orm.public.DocumentTypeVersion.where({ documentTypeId: documentType.id }).orderBy((version) => version.versionNumber.asc()).all();
        const activeVersion = versions.find((version) => version.status === "ACTIVE") ?? null;
        return ({
        id: documentType.id,
        name: documentType.name,
        domain: documentType.domain,
        description: documentType.description,
        createdAt: documentType.createdAt,
        updatedAt: documentType.updatedAt,
        activeVersion: activeVersion ? { id: activeVersion.id, versionNumber: activeVersion.versionNumber, status: activeVersion.status } : null,
        versions: versions.map((version) => ({ id: version.id, versionNumber: version.versionNumber, status: version.status, createdAt: version.createdAt, publishedAt: version.publishedAt })),
      }); })),
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
