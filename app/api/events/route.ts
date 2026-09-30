import { NextRequest, NextResponse } from "next/server";
import { findOne, readDB, insertOne, writeDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Bridge, Event, User } from "@/lib/types";
import { generateId, generateToken, now, computeEventStatus } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";
import {
  ensureAllSpeakersParticipants,
  eventSpeakerIds,
  resolveSpeakerAssignment,
} from "@/lib/speaker-registration";

/** Sync all event statuses then return events */
function getEventsWithStatus(): Event[] {
  const events = readDB<Event>("events");
  let changed = false;
  const updated = events.map((e) => {
    const computed = computeEventStatus(e);
    if (computed !== e.status) {
      changed = true;
      return { ...e, status: computed };
    }
    return e;
  });
  if (changed) writeDB("events", updated);
  return updated;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const orgId = searchParams.get("organizer_id");

  const users = readDB<User>("users");
  let events = getEventsWithStatus();

  if (status) events = events.filter((e) => e.status === status);
  if (category) events = events.filter((e) => e.category === category);
  if (orgId) {
    events = events.filter(
      (e) =>
        e.organizer_id === orgId || eventSpeakerIds(e).includes(orgId)
    );
  }
  if (search) {
    const q = search.toLowerCase();
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
    );
  }

  const result = events.map((e) => ({
    ...e,
    organizer_name:
      users.find((u) => u.id === e.organizer_id)?.full_name ?? "Unknown",
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "organizer") {
    return NextResponse.json(
      {
        error:
          "Speakers cannot create events. The secretariat assigns topics to you — open My Topics to build your quiz.",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
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
    bridge_id,
    is_bridge,
  } = body;

  if (!title || !event_date || !start_time || !end_time || !capacity || !event_type) {
    return NextResponse.json({ error: "Required fields missing." }, { status: 400 });
  }

  const assignment = resolveSpeakerAssignment({
    speaker_ids,
    speaker_id,
    speaker,
  });
  if (!assignment.ok) {
    return NextResponse.json({ error: assignment.error }, { status: 400 });
  }

  if (!["webinar", "seminar"].includes(event_type)) {
    return NextResponse.json(
      { error: "Event type must be webinar or seminar." },
      { status: 400 }
    );
  }
  if (event_type === "webinar" && !platform_link) {
    return NextResponse.json(
      { error: "Platform link is required for webinars." },
      { status: 400 }
    );
  }
  if (event_type === "seminar" && !location) {
    return NextResponse.json(
      { error: "Location is required for seminars." },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5);
  if (event_date < today) {
    return NextResponse.json(
      { error: "Event date cannot be in the past." },
      { status: 400 }
    );
  }
  if (event_date === today && start_time <= nowTime) {
    return NextResponse.json(
      {
        error:
          "Start time must be later than current time for today.",
      },
      { status: 400 }
    );
  }
  if (end_time <= start_time) {
    return NextResponse.json(
      { error: "End time must be after start time." },
      { status: 400 }
    );
  }

  const normalizedBridgeId = String(bridge_id ?? "").trim();
  const bridge = normalizedBridgeId
    ? findOne<Bridge>("bridges", (item) => item.id === normalizedBridgeId)
    : null;
  if (normalizedBridgeId && !bridge) {
    return NextResponse.json({ error: "The selected bridge does not exist." }, { status: 400 });
  }
  if (bridge?.is_active === false) {
    return NextResponse.json({ error: "This bridge is inactive. Turn it on before creating events." }, { status: 409 });
  }
  if (is_bridge && !bridge) {
    return NextResponse.json({ error: "Create bridge events from the selected Bridge workspace." }, { status: 400 });
  }
  const resolvedBridgeName = bridge?.title ?? null;
  const resolvedBridgeId = bridge?.id ?? null;

  const event: Event = {
    id: generateId(),
    title,
    description: description ?? "",
    event_type,
    location: event_type === "seminar" ? (location ?? "") : "",
    platform_link: event_type === "webinar" ? (platform_link ?? "") : "",
    platform_name: event_type === "webinar" ? (platform_name ?? "") : "",
    speaker: assignment.speaker,
    speaker_id: assignment.speaker_id,
    speaker_ids: assignment.speaker_ids,
    event_date,
    start_time,
    end_time,
    capacity: Number(capacity),
    status: "upcoming",
    registration_token: generateToken(),
    organizer_id: user.id,
    banner_image: null,
    category: category ?? "Technology",
    bridge_name: resolvedBridgeName,
    bridge_id: resolvedBridgeId,
    created_at: now(),
  };

  insertOne("events", event);
  ensureAllSpeakersParticipants(event);

  const hostIds = new Set<string>();
  hostIds.add(user.id);
  for (const sid of assignment.speaker_ids) hostIds.add(sid);
  for (const uid of hostIds) {
    createNotification({
      user_id: uid,
      type: "event_created",
      title: "Event created",
      body: `"${event.title}" is ready. Manage roster and attendance from your portal.`,
      link:
        user.role === "admin" && uid === user.id
          ? `/dashboard/events`
          : `/speaker/hosted/${event.id}`,
    });
  }

  return NextResponse.json(event, { status: 201 });
}
