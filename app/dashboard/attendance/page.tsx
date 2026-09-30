import { notFound } from "next/navigation";
import { findOne, readDB } from "@/lib/db";
import { Event, Participant, AttendanceLog } from "@/lib/types";
import EventMetaList from "@/components/EventMetaList";
import Link from "next/link";
import QRScanner from "./QRScanner";
import { getSessionUser } from "@/lib/session";
import { requireAdmin } from "@/lib/speaker-portal";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser();
  requireAdmin(user);

  const sp = await searchParams;
  const eventId = sp.event_id;
  if (!eventId) notFound();

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) notFound();

  const participants = readDB<Participant>("participants").filter((p) => p.event_id === eventId);
  const logs = readDB<AttendanceLog>("attendance_logs").filter((l) => l.event_id === eventId);

  const attended   = participants.filter((p) => p.status === "attended");
  const registered = participants.filter((p) => p.status === "registered");

  const isWebinar = event.event_type === "webinar";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{isWebinar ? "Webinar Attendance" : "QR Attendance Scanner"}</h2>
          <p className="text-muted">{event.title}</p>
        </div>
        <Link href={`/dashboard/participants?event_id=${eventId}`} className="btn btn-secondary">Participants</Link>
      </div>

      {/* Event summary strip */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {[
          { label: "Registered", value: registered.length + attended.length, abbr: "R" },
          { label: "Attended", value: attended.length, abbr: "A" },
          { label: "Pending", value: registered.length, abbr: "P" },
          { label: "Attendance Rate", value: `${(registered.length + attended.length) > 0 ? Math.round(attended.length / (registered.length + attended.length) * 100) : 0}%`, abbr: "%" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: ".875rem 1.25rem", minWidth: 130, textAlign: "center", flex: 1 }}>
            <div className="stat-icon stat-abbr" style={{ width: 40, height: 40, margin: "0 auto .5rem", background: "var(--primary-light)", color: "var(--primary)" }}>{s.abbr}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.2 }}>{s.value}</div>
            <div style={{ fontSize: ".75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--gray-500)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {isWebinar ? (
        /* ── Webinar: self-confirmation table ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className="card card-gold">
            <div className="card-header">
              <h3>How Webinar Attendance Works</h3>
            </div>
            <div className="card-body">
              <p style={{ fontSize: ".9375rem", color: "var(--gray-700)", marginBottom: "1rem" }}>
                Since this is an online event, participants confirm their own attendance by clicking the
                <strong> &quot;Confirm My Attendance&quot;</strong> button on their confirmation page or student dashboard.
              </p>
              <div style={{ background: "var(--primary-light)", borderRadius: "var(--radius)", padding: "1rem", marginBottom: "1rem" }}>
                <div style={{ fontWeight: 700, marginBottom: ".5rem", color: "var(--primary-dark)" }}>Attendance Link Format</div>
                <code style={{ fontSize: ".8125rem", color: "var(--primary-dark)", wordBreak: "break-all" }}>
                  /api/attendance/confirm?token=&#x3C;attendance_token&#x3E;
                </code>
              </div>
              <div style={{ fontWeight: 600, marginBottom: ".5rem" }}>Participant Attendance Status</div>
              <div style={{ maxHeight: 250, overflowY: "auto" }}>
                {participants.filter((p) => p.status !== "cancelled").map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".625rem 0", borderBottom: "1px solid var(--gray-200)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: ".9375rem" }}>{p.full_name}</div>
                      <div style={{ fontSize: ".8rem", color: "var(--gray-500)" }}>{p.course} · Year {p.year_level}</div>
                    </div>
                    <span className={`badge badge-${p.status}`}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Recent Confirmations</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              {logs.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: "2rem" }}>No attendance confirmed yet.</p>
              ) : (
                <ul style={{ listStyle: "none" }}>
                  {logs.slice().reverse().slice(0, 20).map((log) => {
                    const p = participants.find((x) => x.id === log.participant_id);
                    return (
                      <li key={log.id} style={{ padding: ".75rem 1.5rem", borderBottom: "1px solid var(--gray-200)", display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <strong>{p?.full_name ?? "Unknown"}</strong>
                          <div style={{ fontSize: ".8rem", color: "var(--gray-500)" }}>{p?.course} · Y{p?.year_level}</div>
                        </div>
                        <span style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>
                          {new Date(log.scanned_at).toLocaleTimeString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Seminar: QR Scanner ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", maxWidth: 900 }}>
          <QRScanner />
          <div className="card">
            <div className="card-header"><h3>Event Info</h3></div>
            <div className="card-body">
              <EventMetaList event={event} />
              <div className="event-meta" style={{ marginTop: ".5rem" }}>
                <div className="event-meta-item">
                  <span className="event-meta-label">Capacity</span>
                  <span className="event-meta-value">{event.capacity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
