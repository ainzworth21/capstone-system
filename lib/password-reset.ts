import { PasswordReset } from "@/lib/types";

export type ResetTokenCheck =
  | { ok: true }
  | { ok: false; error: string };

/** Shared rules for one-time password reset tokens. */
export function validateResetToken(
  row: Pick<PasswordReset, "used_at" | "expires_at"> | null | undefined,
  nowMs = Date.now()
): ResetTokenCheck {
  if (!row) {
    return {
      ok: false,
      error: "This reset link is invalid or has already been used.",
    };
  }
  if (row.used_at) {
    return { ok: false, error: "This reset link has already been used." };
  }
  if (new Date(row.expires_at).getTime() < nowMs) {
    return {
      ok: false,
      error: "This reset link has expired. Please request a new one.",
    };
  }
  return { ok: true };
}
