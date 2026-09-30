import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Event, Participant } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import Link from "next/link";
import EventMetaList from "@/components/EventMetaList";
import EventTypeBadge from "@/components/EventTypeBadge";

export default async function StudentBrowsePage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const user = await getSessionUser()!;
  const sp = await searchParams;

  const allEvents = readDB<Event>("events");
  let changed = false;
  const events = allEvents.map((e) => {
    const s = computeEventStatus(e);
    if (s !== e.status) { changed = true; return { ...e, status: s }; }
    return e;
  });
  if (changed) writeDB("events", events);

  const myRegs = readDB<Participant>("participants")
    .filter((p) => p.email.toLowerCase() === user!.email.toLowerCase() && p.status !== "cancelled");

  const categories = [...new Set(events.map((e) => e.category))].sort();

  let filtered = events.filter((e) => ["upcoming","ongoing"].includes(e.status));
  if (sp.search)   filtered = filtered.filter((e) => e.title.toLowerCase().includes(sp.search.toLowerCase()));
  if (sp.category) filtered = filtered.filter((e) => e.category === sp.category);

  const myRegMap = new Map(myRegs.map((r) => [r.event_id, r.status]));

  return (
    <div>
      <div className="page-header">
        <h2>Browse Events</h2>
        <p className="text-muted" style={{ margin: 0 }}>Discover and join upcoming campus events</p>
      </div>

      <form method="GET" className="filter-bar">
        <input name="search" className="form-control" placeholder="Search events…" defaultValue={sp.search ?? ""} />
        <select name="category" className="form-control" defaultValue={sp.category ?? ""}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="btn btn-primary">Search</button>
        <Link href="/speaker/browse" className="btn btn-secondary">Clear</Link>
      </form>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="card-body empty-state">
            <h3>No events available</h3>
            <p className="text-muted">Check back soon for new upcoming events.</p>
          </div>
        </div>
      ) : (
        <div className="events-grid">
          {filtered.map((ev) => {
            const myStatus = myRegMap.get(ev.id);
            const allP = readDB<Participant>("participants");
            const reg = allP.filter((p) => p.event_id === ev.id && ["registered","attended"].includes(p.status)).length;
            const pct = ev.capacity > 0 ? Math.min(100, Math.round(reg / ev.capacity * 100)) : 0;

            return (
              <div key={ev.id} className="event-card">
                <div className="event-banner">
                  <span className="event-category">{ev.category}</span>
                  {myStatus && (
                    <span style={{ position: "absolute", top: ".75rem", right: ".75rem", background: "rgba(26,92,56,.85)", color: "var(--gold)", padding: ".2rem .6rem", borderRadius: "2rem", fontSize: ".72rem", fontWeight: 700, border: "1px solid rgba(201,168,76,.4)" }}>
                      {myStatus.charAt(0).toUpperCase() + myStatus.slice(1)}
                    </span>
                  )}
                </div>
                <div className="event-card-body">
                  <div className="event-title">{ev.title}</div>
                  {ev.description && (
                    <p style={{ fontSize: ".875rem", color: "var(--gray-500)", marginBottom: ".75rem" }}>
                      {ev.description.slice(0, 90)}{ev.description.length > 90 ? "…" : ""}
                    </p>
                  )}
                  <EventMetaList event={ev} />
                  <div style={{ fontSize: ".875rem", color: "var(--gray-500)", marginTop: ".5rem" }}>{reg}/{ev.capacity} registered</div>
                  <div className="capacity-bar mt-4">
                    <div className={`capacity-fill ${pct >= 100 ? "full" : pct >= 80 ? "near" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="event-card-footer">
                  <div style={{ display: "flex", flexDirection: "column", gap: ".375rem" }}>
                    <span className={`badge badge-${ev.status}`}>{ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}</span>
                    <EventTypeBadge eventType={ev.event_type} />
                  </div>
                  {myStatus === "registered" ? (
                    <span className="badge badge-registered">Registered</span>
                  ) : myStatus === "waitlist" ? (
                    <span className="badge badge-waitlist">Waitlist</span>
                  ) : pct < 100 ? (
                    <Link href={`/register/${ev.registration_token}`} className="btn btn-gold btn-sm">Register</Link>
                  ) : (
                    <Link href={`/register/${ev.registration_token}`} className="btn btn-secondary btn-sm">Join Waitlist</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
