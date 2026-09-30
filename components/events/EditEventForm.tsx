"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Event } from "@/lib/types";
import { SpeakerSelect } from "@/components/SpeakerSelect";
import { eventSpeakerIds } from "@/lib/speaker-ids";

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "Cisco Webex", "YouTube Live", "Facebook Live", "Other"];

export default function EditEventForm({
  event,
  portal = "admin",
}: {
  event: Event;
  /** Speakers use native speaker portal links (admin dashboard is blocked for them). */
  portal?: "admin" | "speaker";
}) {
  const router = useRouter();
  const isSpeakerPortal = portal === "speaker";
  const manageHref = isSpeakerPortal
    ? `/speaker/hosted/${event.id}`
    : `/dashboard/events/${event.id}/manage`;
  const quizHref = isSpeakerPortal
    ? `/speaker/hosted/${event.id}?tab=quiz`
    : `/dashboard/events/${event.id}/manage?tab=quiz`;
  const rosterHref = isSpeakerPortal
    ? `/speaker/hosted/${event.id}/roster`
    : `/dashboard/participants?event_id=${event.id}`;
  const backHref = isSpeakerPortal ? "/speaker/hosted" : "/dashboard/events";
  const initialIds = eventSpeakerIds(event);
  const [form, setForm] = useState({
    title: event.title,
    description: event.description ?? "",
    speaker: event.speaker ?? "",
    speaker_id: initialIds[0] ?? "",
    speaker_ids: initialIds,
    event_type: (event.event_type ?? "seminar") as "webinar" | "seminar",
    location: event.location ?? "",
    platform_link: event.platform_link ?? "",
    platform_name: event.platform_name ?? "Zoom",
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    capacity: String(event.capacity),
    category: event.category,
    is_bridge: Boolean(event.bridge_name),
    bridge_name: event.bridge_name ?? "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((cats: string[]) => setCategories(cats));
  }, []);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function addCategory() {
    if (!newCat.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCat.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setCategories(data);
    setForm((f) => ({ ...f, category: newCat.trim() }));
    setNewCat("");
    setAddingCat(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    const payload = {
      ...form,
      capacity: Number(form.capacity),
      bridge_name: form.is_bridge ? (form.bridge_name || form.title).trim() : "",
      bridge_id: form.is_bridge ? (form.bridge_name || form.title).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `bridge-${event.id}` : "",
      is_bridge: form.is_bridge,
    };
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setSuccess("Event updated successfully!");
    router.refresh();
  }

  const isWebinar = form.event_type === "webinar";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Edit Event</h2>
          <p className="text-muted">{event.title}</p>
        </div>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <Link href={quizHref} className="btn btn-gold">
            Edit Quiz
          </Link>
          <Link href={manageHref} className="btn btn-secondary">
            Manage
          </Link>
          <Link href={rosterHref} className="btn btn-secondary">
            Participants
          </Link>
          <Link href={backHref} className="btn btn-secondary">
            Back
          </Link>
        </div>
      </div>

      {/* Share link */}
      <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
        <div style={{ flex: 1 }}>
          <strong>Registration Link:</strong>{" "}
          <span style={{ wordBreak: "break-all", fontSize: ".9rem" }}>/register/{event.registration_token}</span>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: ".75rem" }}
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register/${event.registration_token}`)}>
            Copy
          </button>
        </div>
      </div>

      {/* Status indicator */}
      <div style={{ padding: "1rem 1.25rem", background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: ".8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--gray-500)" }}>Current Status</div>
          <span className={`badge badge-${event.status}`} style={{ marginTop: ".25rem" }}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: ".8125rem", color: "var(--gray-500)" }}>
          Status is auto-updated by the system based on date and time.
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>

            {/* Event Type Toggle */}
            <div className="form-group">
              <label className="form-label">Event Type *</label>
              <div style={{ display: "flex", gap: "1rem" }}>
                {(["webinar","seminar"] as const).map((t) => (
                  <label key={t} style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", padding: ".75rem 1.25rem", border: `2px solid ${form.event_type === t ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius)", background: form.event_type === t ? "var(--gold-light)" : "var(--surface)", fontWeight: form.event_type === t ? 700 : 400, flex: 1, justifyContent: "center", fontSize: "1rem", transition: "all .2s" }}>
                    <input type="radio" name="event_type" value={t} checked={form.event_type === t}
                      onChange={() => set("event_type", t)} style={{ display: "none" }} />
                    {t === "seminar" ? "Seminar" : "Webinar"}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Event Title *</label>
              <input className="form-control" value={form.title}
                onChange={(e) => set("title", e.target.value)} required maxLength={150} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <input
                  type="checkbox"
                  checked={form.is_bridge}
                  onChange={(e) => setForm((f) => ({ ...f, is_bridge: e.target.checked }))}
                />
                Mark as Bridge event
              </label>
              {form.is_bridge && (
                <input
                  className="form-control"
                  value={form.bridge_name}
                  onChange={(e) => setForm((f) => ({ ...f, bridge_name: e.target.value }))}
                  placeholder="e.g. Bridge 1: Digital Skills"
                  maxLength={120}
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={4} value={form.description}
                onChange={(e) => set("description", e.target.value)}
                style={{ resize: "vertical", minHeight: 100 }} />
            </div>

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

            {isWebinar ? (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Platform *</label>
                  <select className="form-control" value={form.platform_name} onChange={(e) => set("platform_name", e.target.value)}>
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Platform Meeting Link *</label>
                  <input type="url" className="form-control" placeholder="https://zoom.us/j/..."
                    value={form.platform_link} onChange={(e) => set("platform_link", e.target.value)} required />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Venue / Location *</label>
                <input className="form-control" placeholder="e.g. CvSU Lecture Hall A"
                  value={form.location} onChange={(e) => set("location", e.target.value)} required />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Event Date *</label>
                <input type="date" className="form-control" value={form.event_date}
                  onChange={(e) => set("event_date", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input type="number" className="form-control" min={1} value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input type="time" className="form-control" value={form.start_time}
                  onChange={(e) => set("start_time", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input type="time" className="form-control" value={form.end_time}
                  onChange={(e) => set("end_time", e.target.value)} required />
              </div>
            </div>

            {/* Module with Add New */}
            <div className="form-group">
              <label className="form-label">Module *</label>
              <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <select className="form-control" style={{ flex: 1, minWidth: 200 }}
                  value={form.category} onChange={(e) => set("category", e.target.value)} required>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {!addingCat ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddingCat(true)}>
                    Add Module
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                    <input className="form-control" placeholder="New module" style={{ width: 180 }}
                      value={newCat} onChange={(e) => setNewCat(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())} autoFocus />
                    <button type="button" className="btn btn-gold btn-sm" onClick={addCategory}>Save</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAddingCat(false); setNewCat(""); }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <Link href="/dashboard/events" className="btn btn-secondary">Cancel</Link>
              <button type="submit" className="btn btn-gold" disabled={loading}>
                {loading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
