import type { Event } from "./types";

/** Resolve speaker_ids from legacy speaker_id or the array field. */
export function eventSpeakerIds(
  event: Pick<Event, "speaker_id" | "speaker_ids"> | null | undefined
): string[] {
  if (!event) return [];
  if (Array.isArray(event.speaker_ids) && event.speaker_ids.length > 0) {
    return [...new Set(event.speaker_ids.filter(Boolean))];
  }
  return event.speaker_id ? [event.speaker_id] : [];
}

export function isAssignedSpeaker(
  event: Pick<Event, "speaker_id" | "speaker_ids"> | null | undefined,
  userId: string
): boolean {
  return eventSpeakerIds(event).includes(userId);
}

/** Short label for tables: "Name" or "Name +2". Safe for client + server. */
export function speakersTableLabel(event: Event): string {
  const ids = eventSpeakerIds(event);
  if (ids.length === 0) return event.speaker?.trim() || "—";
  const first =
    event.speaker?.split(" · ")[0]?.trim() ||
    event.speaker?.trim() ||
    "Speaker";
  if (ids.length === 1) return first;
  return `${first} +${ids.length - 1}`;
}
