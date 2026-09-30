import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne } from "@/lib/db";
import { Participant, Event } from "@/lib/types";
import Navbar from "@/components/Navbar";
import EventMetaList from "@/components/EventMetaList";
import Link from "next/link";
import QRDisplay from "./QRDisplay";

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const participant = findOne<Participant>("participants", (p) => p.id === sp.pid);
  if (!participant) notFound();
  const event = findOne<Event>("events", (e) => e.id === participant.event_id);
  if (!event) notFound();

  const isWaitlisted = participant.status === "waitlist";

  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 600, padding: "3rem 1.5rem" }}>
        <div style={{ textAlign: "center" }}>
          {isWaitlisted ? (
            <>
              <div className="status-mark status-mark-wait">WL</div>
              <h2 style={{ fontSize: "1.75rem", marginBottom: ".75rem" }}>You&apos;re on the Waitlist</h2>
              <p className="text-muted">The event is full. You&apos;ll be notified if a spot opens up.</p>
            </>
          ) : (
            <>
              <div className="status-mark status-mark-success">OK</div>
              <h2 style={{ fontSize: "1.75rem", marginBottom: ".75rem" }}>Registration Confirmed</h2>
              <p className="text-muted">You&apos;re all set for <strong>{event.title}</strong>.</p>
            </>
          )}

          {/* Event Details */}
          <div className="card mt-6" style={{ textAlign: "left" }}>
            <div className="card-body">
              <h4 style={{ marginBottom: "1rem" }}>{event.title}</h4>
              <EventMetaList event={event} />
              {event.event_type === "webinar" && event.platform_link && !isWaitlisted && (
                <div className="join-link-panel">
                  <div className="join-link-label">Join link ({event.platform_name})</div>
                  <a href={event.platform_link} target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--primary)", wordBreak: "break-all", fontWeight: 600 }}>
                    {event.platform_link}
                  </a>
                  <div style={{ fontSize: ".8125rem", color: "var(--gray-500)", marginTop: ".375rem" }}>
                    Save this link — you'll need it to join the event.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR Code (seminar) OR Attendance Confirmation button (webinar) */}
          {!isWaitlisted && (
            <>
              {event.event_type === "seminar" ? (
                <div className="qr-container mt-6">
                  <h4>Your Attendance QR Code</h4>
                  <QRDisplay token={participant.attendance_token} />
                  <p className="text-muted" style={{ fontSize: ".875rem" }}>
                    Show this QR code at the seminar entrance for quick check-in.
                  </p>
                </div>
              ) : (
                <div className="webinar-attendance-panel">
                  <h4 style={{ marginBottom: ".5rem" }}>Webinar Attendance</h4>
                  <p className="text-muted" style={{ fontSize: ".9375rem", marginBottom: "1.25rem" }}>
                    When the webinar starts, click the button below to confirm your attendance.
                    This is your unique attendance link — do not share it with others.
                  </p>
                  <a
                    href={`/api/attendance/confirm?token=${participant.attendance_token}`}
                    className="btn btn-gold btn-lg"
                    style={{ display: "inline-flex", marginBottom: ".875rem" }}
                  >
                    Confirm My Attendance
                  </a>
                  <div style={{ fontSize: ".8125rem", color: "var(--gray-500)" }}>
                    Click this once you have joined the webinar session.
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
            {user?.role === "student" || user?.role === "organizer" ? (
              <Link
                href={user.role === "organizer" ? "/speaker/dashboard" : "/student/dashboard"}
                className="btn btn-gold"
              >
                My Dashboard
              </Link>
            ) : (
              <Link href="/events" className="btn btn-outline-gold">Browse Events</Link>
            )}
            {!isWaitlisted && (
              <Link href={`/cancel/${participant.cancel_token}`} className="btn btn-secondary">Cancel Registration</Link>
            )}
          </div>
        </div>
      </div>
      <footer className="footer"><p>© {new Date().getFullYear()} CvSU Campus Event Management System</p></footer>
    </>
  );
}
