import { NextRequest, NextResponse } from "next/server";
import { findOne, readDB, updateOne, writeDB } from "@/lib/db";
import { getSession, getSessionUser } from "@/lib/session";
import { Participant, User } from "@/lib/types";
import { writeAuditLog } from "@/lib/audit";
import { composeFullName } from "@/lib/registration-fields";

/** Speaker updates own profile; email change allowed only while remaining > 0. */
export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "organizer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const fullName = String((body as { full_name?: string }).full_name ?? "").trim();
  const titlePosition = String(
    (body as { title_position?: string }).title_position ?? ""
  ).trim();
  const affiliation = String(
    (body as { affiliation?: string }).affiliation ?? ""
  ).trim();
  const bio = String((body as { bio?: string }).bio ?? "").trim();
  const firstName = String((body as { first_name?: string }).first_name ?? "").trim();
  const lastName = String((body as { last_name?: string }).last_name ?? "").trim();
  const newEmailRaw = (body as { email?: string }).email;
  const wantsEmailChange =
    typeof newEmailRaw === "string" && newEmailRaw.trim() !== "";

  const current = findOne<User>("users", (u) => u.id === sessionUser.id);
  if (!current) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  let email = current.email;
  let emailChangesRemaining = current.email_changes_remaining ?? 0;
  let emailChanged = false;

  if (wantsEmailChange) {
    const nextEmail = newEmailRaw!.trim().toLowerCase();
    if (nextEmail !== current.email.toLowerCase()) {
      if (emailChangesRemaining < 1) {
        return NextResponse.json(
          {
            error:
              "You can only change your email once. Contact the secretariat if you need another update.",
          },
          { status: 403 }
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return NextResponse.json(
          { error: "Enter a valid email address." },
          { status: 400 }
        );
      }
      const taken = findOne<User>(
        "users",
        (u) => u.id !== current.id && u.email.toLowerCase() === nextEmail
      );
      if (taken) {
        return NextResponse.json(
          { error: "That email is already in use." },
          { status: 409 }
        );
      }
      email = nextEmail;
      emailChangesRemaining = 0;
      emailChanged = true;
    }
  }

  const resolvedName =
    fullName ||
    composeFullName({
      first_name: firstName || current.first_name,
      last_name: lastName || current.last_name,
      full_name: current.full_name,
    }) ||
    current.full_name;

  updateOne<User>(
    "users",
    (u) => u.id === current.id,
    (u) => ({
      ...u,
      full_name: resolvedName,
      first_name: firstName || u.first_name,
      last_name: lastName || u.last_name,
      title_position: titlePosition || null,
      affiliation: affiliation || null,
      bio: bio || null,
      email,
      email_changes_remaining: emailChangesRemaining,
    })
  );

  if (emailChanged) {
    const oldEmail = current.email.toLowerCase();
    const participants = readDB<Participant>("participants");
    let changed = false;
    const updated = participants.map((p) => {
      if (p.email.toLowerCase() === oldEmail) {
        changed = true;
        return { ...p, email };
      }
      return p;
    });
    if (changed) writeDB("participants", updated);

    writeAuditLog({
      action: "speaker_email_change",
      actor_id: sessionUser.id,
      actor_email: email,
      actor_role: sessionUser.role,
      target_type: "user",
      target_id: current.id,
      summary: `Speaker changed email from ${current.email} to ${email} (one-time)`,
      meta: { previous_email: current.email },
    });
  }

  const session = await getSession();
  if (session.user) {
    session.user = {
      ...session.user,
      full_name: resolvedName,
      first_name: firstName || session.user.first_name,
      last_name: lastName || session.user.last_name,
      email,
      email_changes_remaining: emailChangesRemaining,
    };
    await session.save();
  }

  return NextResponse.json({
    success: true,
    email,
    email_changes_remaining: emailChangesRemaining,
    email_changed: emailChanged,
    message: emailChanged
      ? "Profile saved. Your email was updated — this was your one allowed change."
      : "Profile saved.",
  });
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "organizer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = findOne<User>("users", (u) => u.id === sessionUser.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    full_name: user.full_name,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    title_position: user.title_position ?? "",
    affiliation: user.affiliation ?? "",
    bio: user.bio ?? "",
    email_changes_remaining: user.email_changes_remaining ?? 0,
    must_change_password: !!user.must_change_password,
  });
}
