import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { deleteOne, readDB, writeDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Event, User } from "@/lib/types";
import { writeAuditLog } from "@/lib/audit";
import { eventSpeakerIds } from "@/lib/speaker-registration";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return users without passwords
  const users = readDB<User>("users").map(({ password: _pw, ...u }) => u);
  return NextResponse.json(users);
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId =
    (body as { user_id?: string }).user_id ||
    new URL(req.url).searchParams.get("user_id") ||
    "";

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  if (userId === session.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  const users = readDB<User>("users");
  const target = users.find((u) => u.id === userId);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (target.role === "admin") {
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin account." },
        { status: 400 }
      );
    }
  }

  const removed = deleteOne<User>("users", (u) => u.id === userId);
  if (!removed) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Detach linked speaker from events (keep display name for history)
  const events = readDB<Event>("events");
  let eventsChanged = false;
  const nextEvents = events.map((e) => {
    const ids = eventSpeakerIds(e);
    if (!ids.includes(userId)) return e;
    eventsChanged = true;
    const nextIds = ids.filter((id) => id !== userId);
    return {
      ...e,
      speaker_ids: nextIds,
      speaker_id: nextIds[0] ?? null,
    };
  });
  if (eventsChanged) writeDB("events", nextEvents);

  if (target.id_image) {
    const filePath = path.join(
      process.cwd(),
      "public",
      "speaker-ids",
      path.basename(target.id_image)
    );
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Ignore missing/unreadable ID photos
    }
  }

  writeAuditLog({
    action: "user_delete",
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    target_type: "user",
    target_id: target.id,
    summary: `Deleted ${target.role} account ${target.email}`,
    meta: { full_name: target.full_name, role: target.role },
  });

  return NextResponse.json({
    success: true,
    message: `${target.full_name} has been deleted.`,
  });
}
