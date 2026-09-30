import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Event, Participant } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import EventMetaList from "@/components/EventMetaList";
import EventTypeBadge from "@/components/EventTypeBadge";
import Link from "next/link";

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const user = await getSessionUser();
  const sp = await searchParams;
  const search = sp.search ?? "";
  const category = sp.category ?? "";
  const status = sp.status ?? "";

  const allEvents = readDB<Event>("events");
  const participants = readDB<Participant>("participants");
  const savedCategories = readDB<string>("categories");

  let changed = false;
  const events = allEvents.map((e) => {
    const s = computeEventStatus(e);
    if (s !== e.status) { changed = true; return { ...e, status: s }; }
    return e;
  });
  if (changed) writeDB("events", events);

  const categories = [
    ...new Set([
      ...(Array.isArray(savedCategories) ? savedCategories : []),
      ...events.map((e) => e.category).filter(Boolean),
    ]),
  ].sort();

  const filtered = events.filter((e) => {
    if (e.status === "cancelled") return false;
    if (status && e.status !== status) return false;
    if (category && e.category !== category) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.event_date.localeCompare(b.event_date));

  function getRegisteredCount(eventId: string) {
    return participants.filter((p) => p.event_id === eventId && ["registered","attended"].includes(p.status)).length;
  }

  const isSpeaker = user?.role === "organizer";
  const hasFilters = !!(search || category || status);

  return (
    <div className="site-shell">
      <Navbar user={user} />
      <main className="site-main">
        <div className="container events-page">
          <div className="page-header">
            <h2>All Events</h2>
            {isSpeaker && (
              <Link href="/speaker/hosted/create" className="btn btn-gold">
                Create Event
              </Link>
            )}
          </div>

          <form method="GET" className="filter-bar">
            <input name="search" className="form-control" placeholder="Search events…" defaultValue={search} />
            <select name="category" className="form-control" defaultValue={category}>
              <option value="">All Modules</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="status" className="form-control" defaultValue={status}>
              <option value="">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
            <button type="submit" className="btn btn-primary">Search</button>
            <Link href="/events" className="btn btn-secondary">Clear</Link>
          </form>

          {filtered.length === 0 ? (
            <div className="card empty-state-card">
              <div className="card-body empty-state events-empty">
                <h3>{hasFilters ? "No events match your filters" : "No events yet"}</h3>
                <p className="text-muted">
                  {hasFilters
                    ? "Try adjusting your search or clear the filters."
                    : isSpeaker
                      ? "Host your first event so participants can register and admin reports can track outcomes."
                      : "Check back soon — new campus events will appear here."}
                </p>
                <div className="events-empty-actions">
                  {hasFilters && (
                    <Link href="/events" className="btn btn-secondary">Clear filters</Link>
                  )}
                  {isSpeaker && (
                    <>
                      <Link href="/speaker/hosted/create" className="btn btn-gold">
                        Create Event
                      </Link>
                      <Link href="/speaker/hosted" className="btn btn-primary">
                        My Hosted Events
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="events-grid">
              {filtered.map((ev) => {
                const reg = getRegisteredCount(ev.id);
                const pct = ev.capacity > 0 ? Math.min(100, Math.round(reg / ev.capacity * 100)) : 0;
                return (
                  <div key={ev.id} className="event-card" data-event-id={ev.id}>
                    <div className="event-banner">
                      <span className="event-category">{ev.category}</span>
                    </div>
                    <div className="event-card-body">
                      <div className="event-title">{ev.title}</div>
                      {ev.description && (
                        <p style={{ fontSize: ".875rem", color: "var(--gray-500)", marginBottom: ".75rem" }}>
                          {ev.description.slice(0, 90)}{ev.description.length > 90 ? "…" : ""}
                        </p>
                      )}
                      <EventMetaList event={ev} />
                      <div style={{ fontSize: ".875rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
                        {reg}/{ev.capacity} registered
                      </div>
                      <div className="capacity-bar mt-4">
                        <div className={`capacity-fill ${pct >= 100 ? "full" : pct >= 80 ? "near" : ""}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="event-card-footer">
                      <div className="event-card-badges">
                        <span className={`badge badge-${ev.status}`} data-status={ev.status}>
                          {ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
                        </span>
                        <EventTypeBadge eventType={ev.event_type} />
                      </div>
                      {ev.status !== "cancelled" && ev.status !== "completed" ? (
                        <Link href={`/register/${ev.registration_token}`} className={`btn btn-sm ${pct >= 100 ? "btn-secondary" : "btn-gold"}`}>
                          {pct >= 100 ? "Join Waitlist" : "Register"}
                        </Link>
                      ) : (
                        <span style={{ fontSize: ".875rem", color: "var(--gray-500)" }}>Registration closed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <footer className="footer"><p>© {new Date().getFullYear()} CvSU Campus Event Management System</p></footer>
    </div>
  );
}
