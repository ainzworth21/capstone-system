import { readDB } from "@/lib/db";
import { Participant, AttendanceLog } from "@/lib/types";
import EventMetaList from "@/components/EventMetaList";
import Link from "next/link";
import QRScanner from "@/components/attendance/QRScanner";
import { requireSpeakerHostedEvent } from "@/lib/hosted-event";

export default async function SpeakerHostedAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event } = await requireSpeakerHostedEvent(id);

  const participants = readDB<Participant>("participants").filter(
    (p) => p.event_id === id
  );
  const logs = readDB<AttendanceLog>("attendance_logs").filter(
    (l) => l.event_id === id
  );

  const attended = participants.filter((p) => p.status === "attended");
  const registered = participants.filter((p) => p.status === "registered");
  const isWebinar = event.event_type === "webinar";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{isWebinar ? "Webinar Attendance" : "QR Attendance Scanner"}</h2>
          <p className="text-muted">{event.title}</p>
        </div>
        <Link
          href={`/speaker/hosted/${id}/roster`}
          className="btn btn-secondary"
        >
          Roster
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        {[
          {
            label: "Registered",
            value: registered.length + attended.length,
            abbr: "R",
          },
          { label: "Attended", value: attended.length, abbr: "A" },
          { label: "Pending", value: registered.length, abbr: "P" },
          {
            label: "Attendance Rate",
            value: `${
              registered.length + attended.length > 0
                ? Math.round(
                    (attended.length / (registered.length + attended.length)) *
                      100
                  )
                : 0
            }%`,
            abbr: "%",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="card"
            style={{
              padding: ".875rem 1.25rem",
              minWidth: 130,
              textAlign: "center",
              flex: 1,
            }}
          >
            <div
              className="stat-icon stat-abbr"
              style={{
                width: 40,
                height: 40,
                margin: "0 auto .5rem",
                background: "var(--primary-light)",
                color: "var(--primary)",
              }}
            >
              {s.abbr}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.2 }}>
              {s.value}
            </div>
            <div
              style={{
                fontSize: ".75rem",
                textTransform: "uppercase",
                letterSpacing: ".05em",
                color: "var(--gray-500)",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {isWebinar ? (
        <div className="card card-gold">
          <div className="card-header">
            <h3>Webinar attendance</h3>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: ".9375rem",
                color: "var(--gray-700)",
                marginBottom: "1rem",
              }}
            >
              Participants confirm their own attendance from their confirmation
              page or student dashboard. You can also mark them attended from
              the roster.
            </p>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {participants
                .filter((p) => p.status !== "cancelled")
                .map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: ".625rem 0",
                      borderBottom: "1px solid var(--gray-200)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: ".9375rem" }}>
                        {p.full_name}
                      </div>
                      <div
                        style={{ fontSize: ".8rem", color: "var(--gray-500)" }}
                      >
                        {p.email}
                      </div>
                    </div>
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </div>
                ))}
            </div>
            {logs.length > 0 && (
              <p className="text-muted" style={{ marginTop: "1rem", fontSize: ".85rem" }}>
                {logs.length} confirmation log
                {logs.length === 1 ? "" : "s"} recorded.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            maxWidth: 900,
          }}
        >
          <QRScanner />
          <div className="card">
            <div className="card-header">
              <h3>Event Info</h3>
            </div>
            <div className="card-body">
              <EventMetaList event={event} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
