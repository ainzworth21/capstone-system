import { notFound, redirect } from "next/navigation";
import { findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Event, SessionUser } from "@/lib/types";
import { isEventHost } from "@/lib/authz";
import { computeEventStatus } from "@/lib/utils";

/** Load an event the logged-in speaker is allowed to host-manage. */
export async function requireSpeakerHostedEvent(
  eventId: string
): Promise<{ user: SessionUser; event: Event }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "organizer") redirect("/speaker/dashboard");

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event || !isEventHost(event, user.id)) notFound();

  return {
    user,
    event: { ...event, status: computeEventStatus(event) },
  };
}
