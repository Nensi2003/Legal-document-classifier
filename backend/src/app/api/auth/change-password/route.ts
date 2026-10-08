import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { changeUserPassword } from "@/services/authService";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body ?? {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await changeUserPassword(user.id, currentPassword, newPassword);
    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Current password is incorrect") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "New password must be different from the current password") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to change password:", error);
    return NextResponse.json({ error: "Unable to change password" }, { status: 500 });
  }
}
