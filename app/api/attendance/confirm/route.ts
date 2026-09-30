import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, insertOne } from "@/lib/db";
import { Participant, AttendanceLog, Event } from "@/lib/types";
import { generateId, now } from "@/lib/utils";

/**
 * Webinar attendance confirmation endpoint.
 * Called when a student clicks the "Confirm My Attendance" link.
 * Token is the participant's attendance_token (same token used for QR in seminars).
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const participants = readDB<Participant>("participants");
  const idx = participants.findIndex((p) => p.attendance_token === token);

  if (idx === -1) {
    return NextResponse.json({ error: "Invalid attendance link." }, { status: 404 });
  }

  const p = participants[idx];

  // Verify the event is actually a webinar
  const events = readDB<Event>("events");
  const event = events.find((e) => e.id === p.event_id);
  if (!event || event.event_type !== "webinar") {
    return NextResponse.json({ error: "This link is only valid for webinar events." }, { status: 400 });
  }

  if (p.status === "attended") {
    // Already confirmed — redirect to a success page showing "already recorded"
    return NextResponse.redirect(
      new URL(`/webinar-attended?status=already&name=${encodeURIComponent(p.full_name)}&event=${encodeURIComponent(event.title)}`, req.url)
    );
  }

  if (p.status === "cancelled" || p.status === "waitlist") {
    return NextResponse.json({ error: `Cannot confirm attendance — registration is ${p.status}.` }, { status: 400 });
  }

  // Mark attended
  participants[idx] = { ...p, status: "attended" };
  writeDB("participants", participants);

  // Log it
  insertOne<AttendanceLog>("attendance_logs", {
    id: generateId(),
    participant_id: p.id,
    event_id: p.event_id,
    scanned_at: now(),
    method: "qr", // reusing "qr" slot — represents self-confirmation for webinars
  });

  return NextResponse.redirect(
    new URL(`/webinar-attended?status=confirmed&name=${encodeURIComponent(p.full_name)}&event=${encodeURIComponent(event.title)}`, req.url)
  );
}
