import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findOne, readDB, writeDB, updateOne } from "@/lib/db";
import { PasswordReset, User } from "@/lib/types";
import { now } from "@/lib/utils";
import { validateResetToken } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String((body as { token?: string }).token ?? "").trim();
  const password = String((body as { password?: string }).password ?? "");

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and new password are required." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const resets = readDB<PasswordReset>("password_resets");
  const idx = resets.findIndex((r) => r.token === token);
  const row = idx === -1 ? null : resets[idx];
  const check = validateResetToken(row);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const user = findOne<User>("users", (u) => u.id === row!.user_id);
  if (
    !user ||
    (user.role !== "student" && user.role !== "organizer") ||
    (user.account_status ?? "approved") !== "approved"
  ) {
    return NextResponse.json(
      { error: "This reset link is no longer valid for this account." },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  updateOne<User>(
    "users",
    (u) => u.id === user.id,
    (u) => ({ ...u, password: hash })
  );

  resets[idx] = { ...row, used_at: now() };
  writeDB("password_resets", resets);

  return NextResponse.json({
    success: true,
    message: "Password updated. You can sign in with your new password.",
  });
}
