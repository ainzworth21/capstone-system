import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, findOne } from "@/lib/db";
import { Participant } from "@/lib/types";
import { now } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { cancel_token } = await req.json();

  const participants = readDB<Participant>("participants");
  const idx = participants.findIndex((p) => p.cancel_token === cancel_token);

  if (idx === -1) return NextResponse.json({ error: "Invalid token." }, { status: 404 });
  if (participants[idx].status === "cancelled") {
    return NextResponse.json({ error: "Already cancelled." }, { status: 409 });
  }

  const eventId = participants[idx].event_id;
  participants[idx] = { ...participants[idx], status: "cancelled" };

  // Promote first waitlisted
  const waitlistIdx = participants.findIndex(
    (p) => p.event_id === eventId && p.status === "waitlist"
  );
  if (waitlistIdx !== -1) {
    participants[waitlistIdx] = { ...participants[waitlistIdx], status: "registered" };
  }

  writeDB("participants", participants);
  return NextResponse.json({ ok: true, promoted: waitlistIdx !== -1 });
}
