"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SpeakerSelect } from "@/components/SpeakerSelect";

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "Cisco Webex", "YouTube Live", "Facebook Live", "Other"];

export default function CreateEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const router = useRouter();
  const params = use(searchParams);
  const bridgeId = typeof params.bridge_id === "string" ? params.bridge_id : "";
  const bridgeName = typeof params.bridge_name === "string" ? params.bridge_name : "";
  const [form, setForm] = useState({
    title: "",
    description: "",
    speaker: "",
    speaker_id: "",
    speaker_ids: [] as string[],
    event_type: "seminar" as "webinar" | "seminar",
    location: "",
    platform_link: "",
    platform_name: "Zoom",
    event_date: "",
    start_time: "",
    end_time: "",
    capacity: "100",
    category: "",
    is_bridge: Boolean(bridgeId && bridgeName),
    bridge_name: bridgeName,
    bridge_id: bridgeId,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((cats: string[]) => {
        setCategories(cats);
        setForm((f) => ({ ...f, category: cats[0] ?? "" }));
      });
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user?: { role?: string } | null }) => {
        if (data.user?.role === "organizer") {
          router.replace("/speaker/hosted");
        }
      })
      .catch(() => {});
  }, [router]);

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
    setError(""); setLoading(true);
    const payload = {
      ...form,
      capacity: Number(form.capacity),
      bridge_name: form.is_bridge ? (form.bridge_name || form.title).trim() : "",
      bridge_id: form.is_bridge ? form.bridge_id : "",
      is_bridge: form.is_bridge,
    };
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/dashboard/events/${data.id}/manage?tab=quiz`);
  }

  const today = new Date().toISOString().split("T")[0];
  const isWebinar = form.event_type === "webinar";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{form.is_bridge ? "Create Bridge Event" : "Create Main Event"}</h2>
          <p className="text-muted">
            {form.is_bridge
              ? `Create a seminar or webinar under ${form.bridge_name}.`
              : "Create a regular seminar or webinar outside the Bridge programs."}
          </p>
        </div>
        <Link href={form.is_bridge ? `/dashboard/bridges/${form.bridge_id}` : "/dashboard/events"} className="btn btn-secondary">Back</Link>
      </div>

      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>

            {/* Event Type Toggle */}
            <div className="form-group">
              <label className="form-label">Event Type *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {(["webinar","seminar"] as const).map((t) => (
                  <label key={t} style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", padding: ".75rem 1.25rem", border: `2px solid ${form.event_type === t ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius)", background: form.event_type === t ? "var(--gold-light)" : "var(--surface)", fontWeight: form.event_type === t ? 700 : 400, justifyContent: "center", fontSize: "1rem", transition: "all .2s", minHeight: "3.25rem" }}>
                    <input type="radio" name="event_type" value={t} checked={form.event_type === t}
                      onChange={() => set("event_type", t)} style={{ display: "none" }} />
                    {t === "seminar" ? "Seminar" : "Webinar"}
                  </label>
                ))}
              </div>
              <div className="form-hint">
                {isWebinar ? "Webinar — hosted online via a platform link." : "Seminar — held at a physical venue."}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Event Title *</label>
              <input className="form-control" placeholder={isWebinar ? "e.g. Introduction to Machine Learning" : "e.g. Research Methods Seminar"}
                value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={150} />
            </div>

            {form.is_bridge && (
              <div className="alert alert-success" role="status">
                This event will be added under <strong>{form.bridge_name}</strong>.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={4} placeholder="Describe the event objectives, topics, and audience…"
                value={form.description} onChange={(e) => set("description", e.target.value)}
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

            {/* Location or Platform Link */}
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
                  <div className="form-hint">Participants will receive this link after registering.</div>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Venue / Location *</label>
                <input className="form-control" placeholder="e.g. CvSU Lecture Hall A, Main Campus"
                  value={form.location} onChange={(e) => set("location", e.target.value)} required />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Event Date *</label>
                <input type="date" className="form-control" min={today}
                  value={form.event_date} onChange={(e) => set("event_date", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Max Capacity *</label>
                <input type="number" className="form-control" min={1}
                  value={form.capacity} onChange={(e) => set("capacity", e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input type="time" className="form-control"
                  value={form.start_time} onChange={(e) => set("start_time", e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input type="time" className="form-control"
                  value={form.end_time} onChange={(e) => set("end_time", e.target.value)} required />
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
                    <input className="form-control" placeholder="New module name" style={{ width: 180 }}
                      value={newCat} onChange={(e) => setNewCat(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())} autoFocus />
                    <button type="button" className="btn btn-gold btn-sm" onClick={addCategory}>Save</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAddingCat(false); setNewCat(""); }}>Cancel</button>
                  </div>
                )}
              </div>
              <div className="form-hint">Select a module or add a new one. New modules are saved for future events.</div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <Link href="/dashboard/events" className="btn btn-secondary">Cancel</Link>
              <button type="submit" className="btn btn-gold" disabled={loading}>
                {loading ? "Creating…" : `Create ${isWebinar ? "Webinar" : "Seminar"}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
