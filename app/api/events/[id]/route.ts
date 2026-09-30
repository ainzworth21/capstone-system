import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Event } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import { canManageEvent } from "@/lib/authz";
import {
  ensureAllSpeakersParticipants,
  eventSpeakerIds,
  resolveSpeakerAssignment,
} from "@/lib/speaker-registration";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = findOne<Event>("events", (e) => e.id === id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...event,
    speaker_ids: eventSpeakerIds(event),
    status: computeEventStatus(event),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const events = readDB<Event>("events");
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManageEvent(user, events[idx])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role === "organizer") {
    return NextResponse.json(
      {
        error:
          "Speakers cannot edit event details. Use the Quiz editor on your assigned topic.",
      },
      { status: 403 }
    );
  }

  const {
    title,
    description,
    location,
    platform_link,
    platform_name,
    speaker,
    speaker_id,
    speaker_ids,
    event_type,
    event_date,
    start_time,
    end_time,
    capacity,
    category,
    bridge_name,
    bridge_id,
    is_bridge,
    status,
  } = body;

  if (end_time <= start_time) {
    return NextResponse.json(
      { error: "End time must be after start time." },
      { status: 400 }
    );
  }

  const currentIds = eventSpeakerIds(events[idx]);
  const speakersTouched =
    speaker_ids !== undefined || speaker_id !== undefined;

  let nextSpeaker = events[idx].speaker;
  let nextSpeakerId = events[idx].speaker_id;
  let nextSpeakerIds = currentIds;

  if (speakersTouched) {
    const assignment = resolveSpeakerAssignment({
      speaker_ids:
        speaker_ids !== undefined
          ? speaker_ids
          : speaker_id
            ? [speaker_id]
            : [],
      speaker_id: speaker_id ?? null,
      speaker,
    });
    if (!assignment.ok) {
      return NextResponse.json({ error: assignment.error }, { status: 400 });
    }
    nextSpeaker = assignment.speaker;
    nextSpeakerId = assignment.speaker_id;
    nextSpeakerIds = assignment.speaker_ids;
  }

  const normalizedBridgeName = String(bridge_name ?? events[idx].bridge_name ?? "").trim();
  const normalizedBridgeId = String(bridge_id ?? events[idx].bridge_id ?? "").trim();
  const isBridgeEvent = Boolean(is_bridge) || /^bridge$/i.test(String(category ?? events[idx].category ?? "")) || /^bridge\b/i.test(String(title ?? events[idx].title ?? ""));
  const resolvedBridgeName = isBridgeEvent
    ? (normalizedBridgeName || String(title ?? events[idx].title).trim().replace(/^Bridge\s*[:#-]?\s*/i, "") || String(title ?? events[idx].title).trim())
    : null;
  const resolvedBridgeSlug = resolvedBridgeName
    ? resolvedBridgeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : "";
  const resolvedBridgeId = isBridgeEvent
    ? (normalizedBridgeId || resolvedBridgeSlug || `bridge-${events[idx].id}`)
    : null;

  const updated: Event = {
    ...events[idx],
    title: title ?? events[idx].title,
    description: description ?? events[idx].description,
    event_type: event_type ?? events[idx].event_type,
    location: event_type === "seminar" ? (location ?? events[idx].location) : "",
    platform_link:
      event_type === "webinar"
        ? (platform_link ?? events[idx].platform_link)
        : "",
    platform_name:
      event_type === "webinar"
        ? (platform_name ?? events[idx].platform_name)
        : "",
    speaker: nextSpeaker,
    speaker_id: nextSpeakerId,
    speaker_ids: nextSpeakerIds,
    event_date: event_date ?? events[idx].event_date,
    start_time: start_time ?? events[idx].start_time,
    end_time: end_time ?? events[idx].end_time,
    capacity: capacity ? Number(capacity) : events[idx].capacity,
    category: category ?? events[idx].category,
    bridge_name: resolvedBridgeName,
    bridge_id: resolvedBridgeId,
  };

  if (status && ["upcoming", "ongoing", "completed", "cancelled"].includes(status)) {
    updated.status = status;
  } else {
    updated.status = computeEventStatus(updated);
  }

  events[idx] = updated;
  writeDB("events", events);
  ensureAllSpeakersParticipants(updated);

  return NextResponse.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = readDB<Event>("events");
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManageEvent(user, events[idx])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  events[idx] = { ...events[idx], status: "cancelled" };
  writeDB("events", events);
  return NextResponse.json({ ok: true });
}
