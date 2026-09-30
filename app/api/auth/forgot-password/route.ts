import { NextRequest, NextResponse } from "next/server";
import { findOne, readDB, writeDB } from "@/lib/db";
import { PasswordReset, User } from "@/lib/types";
import { generateId, generateToken, now } from "@/lib/utils";
import { emailConfigured, sendPasswordResetEmail } from "@/lib/email";

const GENERIC_MESSAGE =
  "If an eligible participant account exists for that email, a password reset link has been prepared.";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String((body as { email?: string }).email ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = findOne<User>(
    "users",
    (u) => u.email.toLowerCase() === email
  );

  // Speakers use email magic-link login — no password reset
  const eligible =
    !!user &&
    user.role === "student" &&
    (user.account_status ?? "approved") === "approved";

  if (!eligible || !user) {
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }

  const createdAt = now();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
  const token = generateToken();

  let resets = readDB<PasswordReset>("password_resets");
  // Invalidate prior unused tokens for this user
  resets = resets.map((r) =>
    r.user_id === user.id && !r.used_at
      ? { ...r, used_at: createdAt }
      : r
  );

  const row: PasswordReset = {
    id: generateId(),
    user_id: user.id,
    token,
    expires_at: expiresAt,
    used_at: null,
    created_at: createdAt,
  };
  resets.push(row);
  writeDB("password_resets", resets);

  const origin = new URL(req.url).origin;
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

  // Production: send via Resend when configured
  let emailed = false;
  if (emailConfigured()) {
    const sent = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresAt,
    });
    emailed = sent.ok;
  }

  // Demo fallback: return resetUrl when email is not configured (or send failed)
  const payload: Record<string, unknown> = {
    success: true,
    message: emailed
      ? "If an eligible account exists for that email, a reset link has been sent."
      : GENERIC_MESSAGE,
    emailed,
    expiresAt,
  };
  if (!emailed) {
    payload.resetUrl = resetUrl;
  }

  return NextResponse.json(payload);
}
