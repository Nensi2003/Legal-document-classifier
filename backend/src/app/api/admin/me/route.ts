import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { user, error } = await requireAdmin();

    if (!user) {
      return NextResponse.json(
        { error },
        {
          status:
            error === "Not authenticated" ? 401 : 403,
        }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error("Admin authentication error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}