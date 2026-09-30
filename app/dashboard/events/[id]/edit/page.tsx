import { notFound, redirect } from "next/navigation";
import { findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Event } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import EditEventForm from "./EditEventForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role === "student") redirect("/login");

  const { id } = await params;
  const event = findOne<Event>("events", (e) => e.id === id);
  if (!event) notFound();
  if (user.role === "organizer" && event.organizer_id !== user.id) notFound();

  const withStatus = { ...event, status: computeEventStatus(event) };
  return <EditEventForm event={withStatus} />;
}
