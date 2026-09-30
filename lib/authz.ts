import { Event, SessionUser } from "./types";
import { isAssignedSpeaker } from "./speaker-ids";

/** True when the user is the event organizer or an assigned resource speaker. */
export function isEventHost(event: Event, userId: string): boolean {
  return event.organizer_id === userId || isAssignedSpeaker(event, userId);
}

/** Admin, or speaker/organizer who hosts the event. */
export function canManageEvent(
  user: Pick<SessionUser, "id" | "role"> | null | undefined,
  event: Event | null | undefined
): boolean {
  if (!user || !event) return false;
  if (user.role === "admin") return true;
  if (user.role === "organizer" && isEventHost(event, user.id)) return true;
  return false;
}

export function isStaff(
  user: Pick<SessionUser, "role"> | null | undefined
): boolean {
  return !!user && (user.role === "admin" || user.role === "organizer");
}

/** Safe participant fields for list APIs (no cancel/attendance tokens). */
export function publicParticipant<T extends object>(p: T) {
  const {
    attendance_token: _a,
    cancel_token: _c,
    ...rest
  } = p as T & {
    attendance_token?: string;
    cancel_token?: string;
  };
  return rest;
}
