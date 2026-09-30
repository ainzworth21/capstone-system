import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne, readDB } from "@/lib/db";
import { Event, Participant } from "@/lib/types";
import { computeEventStatus, formatDate, formatTime } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { portalHome } from "@/lib/speaker-portal";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const event = findOne<Event>("events", (e) => e.id === id);
  if (!event) notFound();

  const ev = { ...event, status: computeEventStatus(event) };

  // Find participant registration for current user
  let participant: Participant | null = null;
  if (user) {
    participant = findOne<Participant>("participants",
      (p) => p.event_id === id && p.email.toLowerCase() === user.email.toLowerCase() && p.status !== "cancelled"
    ) ?? null;
  }

  const isWebinar = ev.event_type === "webinar";

  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 780, padding: "2.5rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--dark)", marginBottom: ".5rem" }}>
              {ev.title}
            </h1>
            <span className={`badge badge-${ev.status}`} style={{ fontSize: ".875rem" }}>
              {ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
            </span>
          </div>
          <Link href={user ? portalHome(user) : "/events"} className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>

        {/* Details card */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-body" style={{ padding: "1.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <div style={{ fontSize: ".8125rem", color: "var(--gray-500)", marginBottom: ".25rem" }}>Date &amp; Time</div>
                <div style={{ fontWeight: 700 }}>
                  {formatDate(ev.event_date)} &bull; {formatTime(ev.start_time)} — {formatTime(ev.end_time)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".8125rem", color: "var(--gray-500)", marginBottom: ".25rem" }}>
                  {isWebinar ? "Platform" : "Venue"}
                </div>
                <div style={{ fontWeight: 700 }}>
                  {isWebinar ? ev.platform_name : ev.location}
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".8125rem", color: "var(--gray-500)", marginBottom: ".25rem" }}>Topic</div>
                <div style={{ fontWeight: 700 }}>{ev.category}</div>
              </div>
              <div>
                <div style={{ fontSize: ".8125rem", color: "var(--gray-500)", marginBottom: ".25rem" }}>Speaker</div>
                <div style={{ fontWeight: 700 }}>{ev.speaker || "—"}</div>
              </div>
              {isWebinar && ev.platform_link && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: ".8125rem", color: "var(--gray-500)", marginBottom: ".25rem" }}>Meeting Link</div>
                  <a href={ev.platform_link} target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--primary)", fontWeight: 600 }}>
                    Open meeting link ↗
                  </a>
                </div>
              )}
              {ev.description && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: ".8125rem", color: "var(--gray-500)", marginBottom: ".25rem" }}>Summary</div>
                  <div style={{ color: "var(--gray-700)", lineHeight: 1.6 }}>{ev.description}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back button bottom */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Link href={user ? portalHome(user) : "/events"} className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
      <footer className="footer"><p>© {new Date().getFullYear()} CvSU Campus Event Management System</p></footer>
    </>
  );
}
