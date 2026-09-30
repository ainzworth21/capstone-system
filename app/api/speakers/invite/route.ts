import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findOne, insertOne, readDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { User } from "@/lib/types";
import { generateId, generateToken, now } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";
import { composeFullName } from "@/lib/registration-fields";

/** Admin invites a speaker by email (magic-link login; no temp password). */
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String((body as { email?: string }).email ?? "")
    .trim()
    .toLowerCase();
  const fullName = String((body as { full_name?: string }).full_name ?? "").trim();
  const titlePosition = String(
    (body as { title_position?: string }).title_position ?? ""
  ).trim();
  const affiliation = String(
    (body as { affiliation?: string }).affiliation ?? ""
  ).trim();
  const firstName = String((body as { first_name?: string }).first_name ?? "").trim();
  const lastName = String((body as { last_name?: string }).last_name ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  const displayName =
    fullName ||
    composeFullName({
      first_name: firstName,
      last_name: lastName,
      full_name: "",
    }) ||
    email;

  if (!displayName || displayName === email) {
    return NextResponse.json(
      { error: "Speaker full name is required." },
      { status: 400 }
    );
  }

  const existing = findOne<User>(
    "users",
    (u) => u.email.toLowerCase() === email
  );
  if (existing) {
    if (existing.role === "organizer") {
      return NextResponse.json(
        {
          error: "A speaker with this email already exists.",
          existing_id: existing.id,
          existing_name: existing.full_name,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "This email is already registered to another account." },
      { status: 409 }
    );
  }

  // Unusable random password — speakers sign in with email only
  const hash = await bcrypt.hash(generateToken(), 12);

  const user: User = {
    id: generateId(),
    full_name: displayName,
    name_prefix: null,
    first_name: firstName || displayName.split(/\s+/)[0] || displayName,
    middle_initial: null,
    last_name: lastName || displayName.split(/\s+/).slice(1).join(" ") || "",
    name_suffix: null,
    email,
    password: hash,
    role: "organizer",
    account_status: "approved",
    student_id: null,
    course: null,
    year_level: null,
    designation: "Speaker",
    id_image: null,
    title_position: titlePosition || null,
    affiliation: affiliation || null,
    bio: null,
    speaker_active: true,
    must_change_password: false,
    email_changes_remaining: 1,
    created_at: now(),
  };

  insertOne("users", user);

  writeAuditLog({
    action: "speaker_invite",
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    target_type: "user",
    target_id: user.id,
    summary: `Invited speaker ${user.email} (email-only login)`,
    meta: { full_name: user.full_name },
  });

  const speakers = readDB<User>("users").filter(
    (u) =>
      u.role === "organizer" &&
      u.account_status === "approved" &&
      (u.speaker_active ?? true)
  ).length;

  return NextResponse.json({
    success: true,
    speaker: {
      id: user.id,
      full_name: user.full_name,
      title_position: user.title_position ?? "",
      affiliation: user.affiliation ?? "",
      speaker_active: true,
      email: user.email,
    },
    email_changes_remaining: 1,
    message: `Speaker registered (${user.email}). They can sign in at /login/speaker with this email anytime.`,
    speakers_count: speakers,
  });
}
