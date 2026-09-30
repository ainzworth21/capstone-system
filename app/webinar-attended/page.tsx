import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getSessionUser } from "@/lib/session";
import { portalHome } from "@/lib/speaker-portal";

export default async function WebinarAttendedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const status = sp.status ?? "confirmed";
  const name   = sp.name   ?? "Participant";
  const event  = sp.event  ?? "the webinar";

  const isAlready = status === "already";

  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 520, padding: "4rem 1.5rem", textAlign: "center" }}>
        <div className={`status-mark ${isAlready ? "status-mark-wait" : "status-mark-success"}`}>
          {isAlready ? "OK" : "OK"}
        </div>

        {isAlready ? (
          <>
            <h2 style={{ marginBottom: ".75rem" }}>Already Recorded</h2>
            <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
              Hi <strong>{name}</strong>, your attendance for <strong>{event}</strong> was already recorded previously.
            </p>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: ".75rem" }}>Attendance Confirmed</h2>
            <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
              Hi <strong>{name}</strong>, your attendance for <strong>{event}</strong> has been successfully recorded.
            </p>
          </>
        )}

        <div style={{ background: "var(--primary-light)", border: "1px solid #b8ddc8", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "2rem", textAlign: "left" }}>
          <div style={{ fontWeight: 700, marginBottom: ".5rem", color: "var(--primary-dark)" }}>What happens next?</div>
          <ul style={{ listStyle: "disc", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: ".5rem", fontSize: ".9375rem", color: "var(--gray-700)" }}>
            <li>Your attendance is saved in the system</li>
            <li>You may be asked to submit feedback after the event</li>
            <li>You can close this tab and continue the webinar</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          {user?.role === "student" ? (
            <Link href={user ? portalHome(user) : "/events"} className="btn btn-gold">My Dashboard</Link>
          ) : (
            <Link href="/events" className="btn btn-gold">Browse Events</Link>
          )}
        </div>
      </div>
      <footer className="footer">
        <p>© {new Date().getFullYear()} CvSU Campus Event Management System</p>
      </footer>
    </>
  );
}
