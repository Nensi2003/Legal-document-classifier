import { getCurrentUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const drafts = await db.orm.public.Document
      .where({
        userId: user.id,
        status: "DRAFT",
      })
      .all();

    return NextResponse.json({
      drafts,
    });
  } catch (error) {
    console.error("Error getting drafts:", error);

    return NextResponse.json(
      { error: "Failed to get drafts" },
      { status: 500 }
    );
  }
}