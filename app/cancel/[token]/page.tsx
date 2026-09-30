import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne } from "@/lib/db";
import { Participant, Event } from "@/lib/types";
import Navbar from "@/components/Navbar";
import EventMetaList from "@/components/EventMetaList";
import CancelForm from "./CancelForm";

export default async function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getSessionUser();
  const participant = findOne<Participant>("participants", (p) => p.cancel_token === token);
  if (!participant) notFound();
  const event = findOne<Event>("events", (e) => e.id === participant.event_id);
  if (!event) notFound();

  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 520, padding: "3rem 1.5rem" }}>
        <div className="card">
          <div className="card-body text-center" style={{ padding: "2.5rem" }}>
            {participant.status === "cancelled" ? (
              <>
                <div className="status-mark status-mark-cancel">—</div>
                <h2 style={{ marginBottom: ".5rem" }}>Already Cancelled</h2>
                <p className="text-muted">This registration has already been cancelled.</p>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
                  {user?.role === "student" && (
                    <a href="/student/my-events" className="btn btn-gold">My Registrations</a>
                  )}
                  <a href="/events" className="btn btn-secondary">Browse Events</a>
                </div>
              </>
            ) : (
              <>
                <div className="status-mark status-mark-cancel">X</div>
                <h2 style={{ marginBottom: ".5rem" }}>Cancel Registration?</h2>
                <p className="text-muted" style={{ marginBottom: "1.5rem" }}>You are about to cancel your registration for:</p>

                <div className="card" style={{ textAlign: "left", marginBottom: "1.5rem", borderLeft: "4px solid var(--gold)" }}>
                  <div className="card-body" style={{ padding: "1.25rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: ".75rem" }}>{event.title}</div>
                    <EventMetaList event={event} />
                    <div className="event-meta" style={{ marginTop: ".5rem" }}>
                      <div className="event-meta-item">
                        <span className="event-meta-label">Registered as</span>
                        <span className="event-meta-value">{participant.full_name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-warning" style={{ textAlign: "left" }}>
                  <span>This cannot be undone. If a waitlisted participant exists, they will be promoted automatically.</span>
                </div>

                <CancelForm cancelToken={token} isStudent={user?.role === "student"} />
              </>
            )}
          </div>
        </div>
      </div>
      <footer className="footer"><p>© {new Date().getFullYear()} CvSU Campus Event Management System</p></footer>
    </>
  );
}
