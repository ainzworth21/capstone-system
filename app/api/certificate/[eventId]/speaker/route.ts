import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { findOne, readDB } from "@/lib/db";
import { Event, User, IssuedSpeakerCertificate } from "@/lib/types";
import { issueSpeakerCertificate } from "@/lib/certificates";
import { canManageEvent } from "@/lib/authz";
import {
  eventSpeakerIds,
  isAssignedSpeaker,
} from "@/lib/speaker-registration";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!canManageEvent(user, event)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const ids = eventSpeakerIds(event);
  const speakerUserId =
    (body.speaker_user_id as string | undefined) || ids[0] || null;

  if (!speakerUserId) {
    return NextResponse.json(
      {
        error:
          "This event has no linked registered speaker. Edit the event and select a speaker first.",
      },
      { status: 400 }
    );
  }

  if (!isAssignedSpeaker(event, speakerUserId)) {
    return NextResponse.json(
      { error: "That speaker is not assigned to this event." },
      { status: 400 }
    );
  }

  const speaker = findOne<User>(
    "users",
    (u) => u.id === speakerUserId && u.role === "organizer"
  );
  if (!speaker) {
    return NextResponse.json(
      { error: "Linked speaker account was not found." },
      { status: 404 }
    );
  }

  const cert = issueSpeakerCertificate(speaker, event);
  return NextResponse.json(cert);
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (!canManageEvent(user, event)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ids = eventSpeakerIds(event);
  const certs = readDB<IssuedSpeakerCertificate>(
    "issued_speaker_certificates"
  ).filter(
    (c) =>
      c.event_id === eventId &&
      (ids.length === 0 || ids.includes(c.speaker_user_id))
  );

  return NextResponse.json(certs);
}
