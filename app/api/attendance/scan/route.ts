import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, insertOne, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Participant, AttendanceLog, Event } from "@/lib/types";
import { generateId, now } from "@/lib/utils";
import { canManageEvent } from "@/lib/authz";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();
  const participants = readDB<Participant>("participants");
  const idx = participants.findIndex((p) => p.attendance_token === token);

  if (idx === -1) {
    return NextResponse.json({ success: false, message: "Invalid QR code." });
  }

  const p = participants[idx];
  const event = findOne<Event>("events", (e) => e.id === p.event_id);
  if (!canManageEvent(user, event)) {
    return NextResponse.json(
      { success: false, message: "Forbidden for this event." },
      { status: 403 }
    );
  }

  if (p.status === "attended") {
    return NextResponse.json({
      success: false,
      duplicate: true,
      message: "Already scanned.",
      name: p.full_name,
    });
  }
  if (p.status === "cancelled" || p.status === "waitlist") {
    return NextResponse.json({ success: false, message: `Participant is ${p.status}.`, name: p.full_name });
  }

  participants[idx] = { ...p, status: "attended" };
  writeDB("participants", participants);

  const log: AttendanceLog = {
    id: generateId(),
    participant_id: p.id,
    event_id: p.event_id,
    scanned_at: now(),
    method: "qr",
  };
  insertOne("attendance_logs", log);

  return NextResponse.json({
    success: true,
    message: "Attendance recorded!",
    name: p.full_name,
    course: p.course,
    year: p.year_level,
  });
}
