import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findOne, updateOne } from "@/lib/db";
import { getSession, getSessionUser } from "@/lib/session";
import { User } from "@/lib/types";
import { portalHome } from "@/lib/speaker-portal";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(
    (body as { current_password?: string }).current_password ?? ""
  );
  const newPassword = String((body as { password?: string }).password ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required." },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const user = findOne<User>("users", (u) => u.id === sessionUser.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);
  updateOne<User>(
    "users",
    (u) => u.id === user.id,
    (u) => ({ ...u, password: hash, must_change_password: false })
  );

  const session = await getSession();
  if (session.user) {
    session.user = { ...session.user, must_change_password: false };
    await session.save();
  }

  return NextResponse.json({
    success: true,
    message: "Password updated.",
    redirectTo: portalHome(sessionUser),
  });
}
