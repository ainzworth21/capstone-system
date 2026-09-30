import { NextRequest, NextResponse } from "next/server";
import { findOne, readDB, updateOne, writeDB } from "@/lib/db";
import { getSession } from "@/lib/session";
import { SpeakerLoginToken, User } from "@/lib/types";
import { now } from "@/lib/utils";
import { validateResetToken } from "@/lib/password-reset";

/** Consume a speaker magic-link token and open a session. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String((body as { token?: string }).token ?? "").trim();

  if (!token) {
    return NextResponse.json(
      { error: "Sign-in link is missing or invalid." },
      { status: 400 }
    );
  }

  const tokens = readDB<SpeakerLoginToken>("speaker_login_tokens");
  const row = tokens.find((t) => t.token === token) ?? null;
  const check = validateResetToken(row);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const user = findOne<User>(
    "users",
    (u) => u.id === row!.user_id && u.role === "organizer"
  );
  if (!user || (user.account_status ?? "approved") !== "approved") {
    return NextResponse.json(
      { error: "This speaker account is not available." },
      { status: 403 }
    );
  }

  const usedAt = now();
  writeDB(
    "speaker_login_tokens",
    tokens.map((t) =>
      t.token === token ? { ...t, used_at: usedAt } : t
    )
  );

  // Password unused for speakers; clear any legacy force-change flag
  if (user.must_change_password) {
    updateOne<User>(
      "users",
      (u) => u.id === user.id,
      (u) => ({ ...u, must_change_password: false })
    );
  }

  const session = await getSession();
  session.user = {
    id: user.id,
    full_name: user.full_name,
    name_prefix: user.name_prefix ?? null,
    first_name: user.first_name ?? null,
    middle_initial: user.middle_initial ?? null,
    last_name: user.last_name ?? null,
    name_suffix: user.name_suffix ?? null,
    email: user.email,
    role: user.role,
    account_status: user.account_status,
    student_id: user.student_id,
    course: user.course,
    year_level: user.year_level,
    designation: user.designation ?? null,
    must_change_password: false,
    email_changes_remaining: user.email_changes_remaining ?? 0,
  };
  await session.save();

  return NextResponse.json({
    success: true,
    role: "organizer",
  });
}
