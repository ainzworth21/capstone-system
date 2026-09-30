import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Bridge, Event, Participant } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import Link from "next/link";
import EventMetaList from "@/components/EventMetaList";
import EventTypeBadge from "@/components/EventTypeBadge";
import { classifyBridgeEvent, getBridgeForEvent, getEventsForBridge } from "@/lib/bridge";

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

  const selectedSection = sp.section === "bridge" ? "bridge" : "events";
  const bridges = readDB<Bridge>("bridges");
  const bridgeEvents = events.filter((event) => {
    const bridge = getBridgeForEvent(event, bridges);
    if (bridge) return bridge.is_active !== false;
    return Boolean(event.bridge_id) || Boolean(classifyBridgeEvent(event));
  });
  const mainEvents = events.filter((event) => !bridgeEvents.some((bridgeEvent) => bridgeEvent.id === event.id));
  const browseEvents = selectedSection === "bridge" ? bridgeEvents : mainEvents;
  const categories = [...new Set(browseEvents.map((e) => e.category))].sort();

  let filtered = browseEvents.filter((e) => ["upcoming","ongoing"].includes(e.status));
  if (sp.search)   filtered = filtered.filter((e) => e.title.toLowerCase().includes(sp.search.toLowerCase()));
  if (sp.category) filtered = filtered.filter((e) => e.category === sp.category);

  const myRegMap = new Map(myRegs.map((r) => [r.event_id, r.status]));
  const participants = readDB<Participant>("participants");

  const bridgeGroups = bridges.filter((bridge) => bridge.is_active !== false).map((bridge) => ({
    id: bridge.id,
    title: bridge.title,
    partnerName: bridge.partner_name,
    events: getEventsForBridge(filtered, bridge, bridges),
  }));
  const unlistedBridgeGroups = new Map<string, { id: string; title: string; partnerName: string; events: Event[] }>();
  for (const event of filtered) {
    const title = classifyBridgeEvent(event);
    if (!title) continue;
    const bridgeId = event.bridge_id || `legacy:${title.toLowerCase()}`;
    if (bridges.some((bridge) => getEventsForBridge([event], bridge, bridges).length > 0)) continue;
    const group = unlistedBridgeGroups.get(bridgeId) ?? {
      id: bridgeId,
      title,
      partnerName: "",
      events: [],
    };
    group.events.push(event);
    unlistedBridgeGroups.set(bridgeId, group);
  }
  const hasBridgeFilters = Boolean(sp.search || sp.category);
  const visibleBridgeGroups = [...bridgeGroups, ...unlistedBridgeGroups.values()]
    .filter((bridge) => !hasBridgeFilters || bridge.events.length > 0);

  function renderEventCards(eventList: Event[]) {
    if (eventList.length === 0) {
      return (
        <div className="card">
          <div className="card-body empty-state">
            <h3>No events available</h3>
            <p className="text-muted">Check back soon for new upcoming events.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="events-grid">
        {eventList.map((ev) => {
          const myStatus = myRegMap.get(ev.id);
          const registeredCount = participants.filter((p) => p.event_id === ev.id && ["registered", "attended"].includes(p.status)).length;
          const pct = ev.capacity > 0 ? Math.min(100, Math.round(registeredCount / ev.capacity * 100)) : 0;

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
                <div style={{ fontSize: ".875rem", color: "var(--gray-500)", marginTop: ".5rem" }}>{registeredCount}/{ev.capacity} registered</div>
                <div className="capacity-bar mt-4">
                  <div className={`capacity-fill ${pct >= 100 ? "full" : pct >= 80 ? "near" : ""}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="event-card-footer">
                <div style={{ display: "flex", flexDirection: "column", gap: ".375rem" }}>
                  <span className={`badge badge-${ev.status}`}>{ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}</span>
                  <EventTypeBadge eventType={ev.event_type} />
                </div>
                {myStatus === "registered" || myStatus === "attended" ? (
                  <span className={`badge badge-${myStatus}`}>{myStatus === "attended" ? "Attended" : "Registered"}</span>
                ) : myStatus === "waitlist" ? (
                  <span className="badge badge-waitlist">Waitlist</span>
                ) : registeredCount < ev.capacity ? (
                  <Link href={`/register/${ev.registration_token}`} className="btn btn-gold btn-sm">Register</Link>
                ) : (
                  <Link href={`/register/${ev.registration_token}`} className="btn btn-secondary btn-sm">Join Waitlist</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Browse Events</h2>
        <p className="text-muted" style={{ margin: 0 }}>Discover and join upcoming campus events</p>
      </div>

      <div className="report-tabs" aria-label="Browse event sections">
        <Link href="/student/browse?section=events" className={`report-tab ${selectedSection === "events" ? "active" : ""}`}>Events</Link>
        <Link href="/student/browse?section=bridge" className={`report-tab ${selectedSection === "bridge" ? "active" : ""}`}>Bridge Programs</Link>
      </div>

      <form method="GET" className="filter-bar">
        <input type="hidden" name="section" value={selectedSection} />
        <input name="search" className="form-control" placeholder="Search events…" defaultValue={sp.search ?? ""} />
        <select name="category" className="form-control" defaultValue={sp.category ?? ""}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="btn btn-primary">Search</button>
        <Link href={`/student/browse?section=${selectedSection}`} className="btn btn-secondary">Clear</Link>
      </form>

      {selectedSection === "events" ? renderEventCards(filtered) : (
        visibleBridgeGroups.length === 0 ? renderEventCards([]) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {visibleBridgeGroups.map((bridge) => {
              const modules = [...new Set(bridge.events.map((event) => event.category || "General"))].sort((a, b) => a.localeCompare(b));
              return (
                <section key={bridge.id}>
                  <header style={{ borderBottom: "1px solid var(--border)", paddingBottom: ".75rem", marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{bridge.title}</h3>
                      {bridge.partnerName && <p className="text-muted" style={{ margin: ".25rem 0 0" }}>{bridge.partnerName}</p>}
                    </div>
                  </header>
                  <div style={{ display: "grid", gap: "1.25rem" }}>
                    {modules.length === 0 ? <p className="text-muted" style={{ margin: 0 }}>No upcoming events in this Bridge yet.</p> : modules.map((module) => (
                      <div key={`${bridge.id}-${module}`}>
                        <h4 style={{ margin: "0 0 .75rem" }}>{module}</h4>
                        {renderEventCards(bridge.events.filter((event) => (event.category || "General") === module))}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
