import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, insertOne, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Participant, AttendanceLog, Event } from "@/lib/types";
import { generateId, now } from "@/lib/utils";
import { canManageEvent } from "@/lib/authz";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { participant_id } = await req.json();
  const participants = readDB<Participant>("participants");
  const idx = participants.findIndex((p) => p.id === participant_id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const event = findOne<Event>("events", (e) => e.id === participants[idx].event_id);
  if (!canManageEvent(user, event)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  participants[idx] = { ...participants[idx], status: "attended" };
  writeDB("participants", participants);

  insertOne<AttendanceLog>("attendance_logs", {
    id: generateId(),
    participant_id,
    event_id: participants[idx].event_id,
    scanned_at: now(),
    method: "manual",
  });

  return NextResponse.json({ ok: true });
}
