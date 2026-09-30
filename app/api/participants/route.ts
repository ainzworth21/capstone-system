import { NextRequest, NextResponse } from "next/server";
import { readDB, insertOne, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Bridge, Event, Participant } from "@/lib/types";
import { generateId, generateToken, now } from "@/lib/utils";
import {
  normalizeParticipantDemographics,
  normalizeNameParts,
} from "@/lib/registration-fields";
import { canManageEvent, publicParticipant } from "@/lib/authz";
import { getBridgeForEvent } from "@/lib/bridge";
import { getPreTestForEvent } from "@/lib/bridge-settings";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");
  const email = searchParams.get("email");

  let participants = readDB<Participant>("participants");

  if (user.role === "student") {
    participants = participants.filter(
      (p) => p.email.toLowerCase() === user.email.toLowerCase()
    );
  } else if (user.role === "organizer") {
    const myEventIds = new Set(
      readDB<Event>("events")
        .filter((e) => e.organizer_id === user.id)
        .map((e) => e.id)
    );
    participants = participants.filter((p) => myEventIds.has(p.event_id));
  }
  // admin: all

  if (eventId) {
    if (user.role === "organizer") {
      const event = findOne<Event>("events", (e) => e.id === eventId);
      if (!canManageEvent(user, event)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    participants = participants.filter((p) => p.event_id === eventId);
  }
  if (email) {
    if (
      user.role === "student" &&
      email.toLowerCase() !== user.email.toLowerCase()
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    participants = participants.filter(
      (p) => p.email.toLowerCase() === email.toLowerCase()
    );
  }

  return NextResponse.json(participants.map((p) => publicParticipant(p)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    event_token,
    first_name,
    middle_initial,
    last_name,
    name_suffix,
    full_name: legacyFullName,
    student_id,
    email,
    course,
    year_level,
    age,
    organization,
    designation,
    country,
    institution,
  } = body;

  const names = normalizeNameParts({
    name_prefix: "", // prefix is for speakers only
    first_name: first_name || legacyFullName,
    middle_initial,
    last_name,
    name_suffix,
  });

  if (
    !event_token ||
    !names.first_name ||
    !names.last_name ||
    !student_id ||
    !email ||
    !course ||
    year_level === undefined ||
    year_level === "" ||
    age === undefined ||
    age === "" ||
    !organization ||
    !designation ||
    !country ||
    !institution
  ) {
    return NextResponse.json(
      { error: "All required fields must be filled (including first and last name)." },
      { status: 400 }
    );
  }

  const ageNum = Number(age);
  if (Number.isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
    return NextResponse.json(
      { error: "Please enter a valid age." },
      { status: 400 }
    );
  }

  const event = findOne<Event>(
    "events",
    (e) => e.registration_token === event_token
  );
  if (!event || event.status === "cancelled") {
    return NextResponse.json({ error: "Event not available." }, { status: 404 });
  }
  const bridge = getBridgeForEvent(event, readDB<Bridge>("bridges"));
  if (bridge?.is_active === false) {
    return NextResponse.json({ error: "Registration for this Bridge is closed." }, { status: 410 });
  }

  const existing = readDB<Participant>("participants").find(
    (p) =>
      p.event_id === event.id &&
      p.email.toLowerCase() === email.toLowerCase() &&
      p.status !== "cancelled"
  );
  if (existing) {
    return NextResponse.json(
      { error: "You are already registered for this event." },
      { status: 409 }
    );
  }

  const registered = readDB<Participant>("participants").filter((p) =>
    p.event_id === event.id && ["registered", "attended"].includes(p.status)
  ).length;
  const status = registered >= event.capacity ? "waitlist" : "registered";

  const demo = normalizeParticipantDemographics({
    age: ageNum,
    organization,
    designation,
    country,
    institution,
  });

  const participant: Participant = {
    id: generateId(),
    event_id: event.id,
    full_name: names.full_name,
    name_prefix: names.name_prefix,
    first_name: names.first_name,
    middle_initial: names.middle_initial,
    last_name: names.last_name,
    name_suffix: names.name_suffix,
    student_id,
    email: email.toLowerCase(),
    course,
    year_level: Number(year_level),
    age: demo.age,
    organization: demo.organization,
    designation: demo.designation,
    country: demo.country,
    institution: demo.institution,
    registered_at: now(),
    status,
    attendance_token: generateToken(),
    cancel_token: generateToken(),
  };

  insertOne("participants", participant);

  const hasAssessment = !!getPreTestForEvent(event.id);

  return NextResponse.json(
    {
      participant: {
        id: participant.id,
        event_id: participant.event_id,
        full_name: participant.full_name,
        email: participant.email,
        status: participant.status,
      },
      event: {
        id: event.id,
        title: event.title,
        event_type: event.event_type,
      },
      isWaitlisted: status === "waitlist",
      has_pre_assessment: hasAssessment,
    },
    { status: 201 }
  );
}
