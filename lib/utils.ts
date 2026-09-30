import { v4 as uuidv4 } from "uuid";
import { Event } from "./types";

export function generateId(): string {
  return uuidv4();
}

export function generateToken(): string {
  return uuidv4().replace(/-/g, "") + uuidv4().replace(/-/g, "");
}

export function now(): string {
  return new Date().toISOString();
}

/** Compute what status an event should be based on current date/time */
export function computeEventStatus(event: Event): Event["status"] {
  if (event.status === "cancelled") return "cancelled";

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

  const { event_date, start_time, end_time } = event;

  if (event_date > today) return "upcoming";
  if (event_date < today) return "completed";

  // today
  if (currentTime < start_time) return "upcoming";
  if (currentTime >= start_time && currentTime < end_time) return "ongoing";
  return "completed";
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
