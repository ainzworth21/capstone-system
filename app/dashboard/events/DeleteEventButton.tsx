"use client";
import { useRouter } from "next/navigation";

export default function DeleteEventButton({ eventId, title }: { eventId: string; title: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Cancel event "${title}"? Participant records will be preserved.`)) return;
    await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button onClick={handleDelete} className="btn btn-danger btn-sm">Cancel Event</button>
  );
}
