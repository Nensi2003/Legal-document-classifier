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

    const documents = await db.orm.public.Document.all();
    const users = await db.orm.public.User.all();

    return NextResponse.json({
      stats: {
        totalUsers: users.length,
        totalDocuments: documents.length,
        pendingDocuments: documents.filter(
          (document) => document.status === "PENDING"
        ).length,
        draftDocuments: documents.filter(
          (document) => document.status === "DRAFT"
        ).length,
        completedDocuments: documents.filter(
          (document) => document.status === "COMPLETED"
        ).length,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}