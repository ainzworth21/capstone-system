import Link from "next/link";
import { findOne, readDB } from "@/lib/db";
import { Participant, User } from "@/lib/types";
import { requireSpeakerHostedEvent } from "@/lib/hosted-event";
import { composeFullName } from "@/lib/registration-fields";
import AttendanceButton from "@/components/attendance/AttendanceButton";
import RosterAttendanceSnapshot from "@/components/attendance/RosterAttendanceSnapshot";
import {
  eventSpeakerIds,
  speakerDisplayName,
} from "@/lib/speaker-registration";

export default async function SpeakerHostedRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { event } = await requireSpeakerHostedEvent(id);

  const speakerUsers = eventSpeakerIds(event)
    .map((sid) => findOne<User>("users", (u) => u.id === sid))
    .filter(Boolean) as User[];

  let participants = readDB<Participant>("participants").filter(
    (p) => p.event_id === id
  );
  if (sp.status) {
    participants = participants.filter((p) => p.status === sp.status);
  }
  if (sp.search) {
    const q = sp.search.toLowerCase();
    participants = participants.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.student_id.includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }

  const counts = {
    registered: participants.filter((p) => p.status === "registered").length,
    attended: participants.filter((p) => p.status === "attended").length,
    cancelled: participants.filter((p) => p.status === "cancelled").length,
    waitlist: participants.filter((p) => p.status === "waitlist").length,
  };

  const typeLabel = event.event_type === "webinar" ? "Webinar" : "Seminar";
  const speakerLabel =
    speakerUsers.length > 0
      ? speakerUsers.map(speakerDisplayName).join(" · ")
      : (event.speaker || "").trim() || "—";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Event Roster</h2>
          <p className="text-muted">
            {event.title} · {typeLabel}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <Link
            href={`/speaker/hosted/${id}/attendance`}
            className="btn btn-gold"
          >
            Attendance
          </Link>
          <Link href={`/speaker/hosted/${id}`} className="btn btn-secondary">
            Manage
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body">
          <div style={{ fontWeight: 700, marginBottom: ".35rem" }}>
            Speakers: {speakerLabel}
          </div>
          {speakerUsers.length > 1 && (
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {speakerUsers.map((su) => (
                <li key={su.id}>{speakerDisplayName(su)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <RosterAttendanceSnapshot
        counts={counts}
        attendanceHref={`/speaker/hosted/${id}/attendance`}
      />

      <form method="GET" className="filter-bar">
        <input
          name="search"
          className="form-control"
          placeholder="Search name, ID, email…"
          defaultValue={sp.search ?? ""}
        />
        <select
          name="status"
          className="form-control"
          defaultValue={sp.status ?? ""}
        >
          <option value="">All statuses</option>
          <option value="registered">Registered</option>
          <option value="attended">Attended</option>
          <option value="waitlist">Waitlist</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
        <Link
          href={`/speaker/hosted/${id}/roster`}
          className="btn btn-secondary"
        >
          Clear
        </Link>
      </form>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-muted"
                      style={{ padding: "2rem" }}
                    >
                      No participants found.
                    </td>
                  </tr>
                )}
                {participants.map((p, i) => {
                  const name =
                    composeFullName(p) || p.full_name || p.email;
                  return (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td style={{ fontSize: ".9rem" }}>{p.email}</td>
                      <td>{p.designation || "—"}</td>
                      <td>
                        <span className={`badge badge-${p.status}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status !== "cancelled" &&
                          p.status !== "attended" && (
                            <AttendanceButton participantId={p.id} />
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
