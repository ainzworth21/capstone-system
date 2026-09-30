"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Event } from "@/lib/types";
import { SpeakerSelect } from "@/components/SpeakerSelect";
import { eventSpeakerIds } from "@/lib/speaker-ids";

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "Cisco Webex", "YouTube Live", "Facebook Live", "Other"];

export default function EventQuickEditForm({
  event,
  categories,
}: {
  event: Event;
  categories: string[];
}) {
  const router = useRouter();
  const initialIds = eventSpeakerIds(event);
  const [form, setForm] = useState({
    title: event.title,
    category: event.category,
    speaker: event.speaker ?? "",
    speaker_id: initialIds[0] ?? "",
    speaker_ids: initialIds,
    event_type: event.event_type,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    platform_link: event.platform_link ?? "",
    platform_name: event.platform_name || "Zoom",
    location: event.location ?? "",
    status: event.status,
    description: event.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        speaker: form.speaker,
        speaker_id: form.speaker_id,
        speaker_ids: form.speaker_ids,
        event_type: form.event_type,
        platform_link: form.platform_link,
        platform_name: form.platform_name,
        location: form.location,
        event_date: form.event_date,
        start_time: form.start_time,
        end_time: form.end_time,
        category: form.category,
        capacity: event.capacity,
        status: form.status,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to save."); return; }
    router.push("/dashboard/events");
    router.refresh();
  }

  const isWebinar = form.event_type === "webinar";

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <div className="card-header">
        <h3>Edit Event</h3>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Link href={`/dashboard/events/${event.id}/manage?tab=quiz`} className="btn btn-gold btn-sm">
            Edit Quiz
          </Link>
          <Link
            href={`/dashboard/participants?event_id=${event.id}`}
            className="btn btn-primary btn-sm"
          >
            View Roster
          </Link>
          <button type="submit" form="event-quick-edit-form" className="btn btn-secondary btn-sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <Link href="/dashboard/events" className="btn btn-secondary btn-sm">Cancel</Link>
        </div>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error">{error}</div>}

        <form id="event-quick-edit-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-control" required value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-control" value={form.event_type} onChange={(e) => set("event_type", e.target.value)}>
                <option value="webinar">Webinar</option>
                <option value="seminar">Seminar</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Topic *</label>
              <select className="form-control" required value={form.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <SpeakerSelect
                valueIds={form.speaker_ids}
                onChange={(ids, name) =>
                  setForm((f) => ({
                    ...f,
                    speaker_ids: ids,
                    speaker_id: ids[0] ?? "",
                    speaker: name,
                  }))
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="form-control" required value={form.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input type="time" className="form-control" required value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input type="time" className="form-control" required value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            {isWebinar ? (
              <>
                <div className="form-group">
                  <label className="form-label">Platform</label>
                  <select className="form-control" value={form.platform_name} onChange={(e) => set("platform_name", e.target.value)}>
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Webex / Zoom URL</label>
                  <input className="form-control" value={form.platform_link} onChange={(e) => set("platform_link", e.target.value)} placeholder="https://…" />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">Venue / Location *</label>
                <input className="form-control" required value={form.location} onChange={(e) => set("location", e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Status (manual override)</label>
              <select className="form-control" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Complete</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Short Description</label>
            <textarea className="form-control" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </form>
      </div>
    </div>
  );
}
