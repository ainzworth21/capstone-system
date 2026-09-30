import { insertOne, readDB, findOne } from "@/lib/db";
import { Event, Participant, User } from "@/lib/types";
import { generateId, generateToken, now } from "@/lib/utils";
import { composeFullName } from "@/lib/registration-fields";
import {
  eventSpeakerIds,
} from "@/lib/speaker-ids";

export {
  eventSpeakerIds,
  isAssignedSpeaker,
  speakersTableLabel,
} from "@/lib/speaker-ids";

/** Register a speaker account as a participant on an event (idempotent). */
export function ensureSpeakerParticipant(
  event: Event,
  speaker: User
): Participant | null {
  if (speaker.role !== "organizer") return null;

  const existing = readDB<Participant>("participants").find(
    (p) =>
      p.event_id === event.id &&
      p.email.toLowerCase() === speaker.email.toLowerCase() &&
      p.status !== "cancelled"
  );
  if (existing) return existing;

  const fullName =
    composeFullName({
      name_prefix: speaker.name_prefix,
      first_name: speaker.first_name,
      middle_initial: speaker.middle_initial,
      last_name: speaker.last_name,
      name_suffix: speaker.name_suffix,
      full_name: speaker.full_name,
    }) ||
    speaker.full_name ||
    speaker.email;

  const participant: Participant = {
    id: generateId(),
    event_id: event.id,
    full_name: fullName,
    name_prefix: speaker.name_prefix ?? "",
    first_name: speaker.first_name ?? fullName.split(" ")[0] ?? "",
    middle_initial: speaker.middle_initial ?? "",
    last_name: speaker.last_name ?? "",
    name_suffix: speaker.name_suffix ?? "",
    student_id: speaker.student_id || `SPK-${speaker.id.slice(0, 8)}`,
    email: speaker.email.toLowerCase(),
    course: speaker.course || speaker.affiliation || "Speaker",
    year_level: speaker.year_level ?? 0,
    age: null,
    organization: speaker.affiliation || "CvSU",
    designation: "Speaker",
    country: "Philippines",
    institution: speaker.affiliation || "CvSU",
    registered_at: now(),
    status: "registered",
    attendance_token: generateToken(),
    cancel_token: generateToken(),
  };

  insertOne("participants", participant);
  return participant;
}

export function resolveSpeakerUser(speakerId: string | null | undefined) {
  if (!speakerId) return null;
  return (
    findOne<User>(
      "users",
      (u) =>
        u.id === speakerId &&
        u.role === "organizer" &&
        u.account_status === "approved"
    ) ?? null
  );
}

export function speakerDisplayName(u: User): string {
  return (
    [u.full_name, u.title_position, u.affiliation].filter(Boolean).join(", ") ||
    u.full_name
  );
}

/** Sync speaker_ids / speaker_id / speaker display string. */
export function normalizeEventSpeakers(
  event: Event,
  users?: User[]
): Event {
  const ids = eventSpeakerIds(event);
  const list = users ?? readDB<User>("users");
  const names = ids
    .map((id) => {
      const u = list.find((x) => x.id === id);
      return u ? speakerDisplayName(u) : null;
    })
    .filter(Boolean) as string[];

  const display =
    names.length > 0
      ? names.join(" · ")
      : event.speaker || "";

  return {
    ...event,
    speaker_ids: ids,
    speaker_id: ids[0] ?? null,
    speaker: display,
  };
}

/** Validate ids and return normalized speaker fields for create/update. */
export function resolveSpeakerAssignment(input: {
  speaker_ids?: string[] | null;
  speaker_id?: string | null;
  speaker?: string | null;
}):
  | { ok: true; speaker_ids: string[]; speaker_id: string; speaker: string }
  | { ok: false; error: string } {
  let ids: string[] = [];
  if (Array.isArray(input.speaker_ids) && input.speaker_ids.length > 0) {
    ids = [...new Set(input.speaker_ids.map(String).filter(Boolean))];
  } else if (input.speaker_id) {
    ids = [String(input.speaker_id)];
  }

  if (ids.length === 0) {
    return {
      ok: false,
      error:
        "Please select at least one registered speaker, or invite one from the speaker picker.",
    };
  }

  const users: User[] = [];
  for (const id of ids) {
    const u = resolveSpeakerUser(id);
    if (!u) {
      return { ok: false, error: "One or more selected speakers are not valid." };
    }
    users.push(u);
  }

  const speaker =
    input.speaker?.trim() ||
    users.map(speakerDisplayName).join(" · ");

  return {
    ok: true,
    speaker_ids: ids,
    speaker_id: ids[0],
    speaker,
  };
}

/** Auto-register every assigned speaker on the roster. */
export function ensureAllSpeakersParticipants(event: Event): void {
  for (const id of eventSpeakerIds(event)) {
    const u = resolveSpeakerUser(id);
    if (u) ensureSpeakerParticipant(event, u);
  }
}
