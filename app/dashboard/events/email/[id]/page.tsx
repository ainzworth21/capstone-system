import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne, readDB } from "@/lib/db";
import { Event, Participant } from "@/lib/types";
import EmailParticipantsForm from "./EmailParticipantsForm";

export default async function EmailParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const event = findOne<Event>("events", (e) => e.id === id);
  if (!event) notFound();
  if (user.role === "organizer" && event.organizer_id !== user.id) notFound();

  const recipientCount = readDB<Participant>("participants").filter(
    (p) => p.event_id === id && p.status !== "cancelled"
  ).length;

  return (
    <EmailParticipantsForm
      event={{
        id: event.id,
        title: event.title,
        event_type: event.event_type,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        platform_link: event.platform_link ?? "",
        location: event.location ?? "",
      }}
      recipientCount={recipientCount}
      moreInfoUrl="http://localhost:3000"
    />
  );
}
