import { notFound } from "next/navigation";
import { findOne, readDB } from "@/lib/db";
import { Event, Participant, User } from "@/lib/types";
import Link from "next/link";
import AttendanceButton from "./AttendanceButton";
import { composeFullName } from "@/lib/registration-fields";
import { getSessionUser } from "@/lib/session";
import { requireAdmin } from "@/lib/speaker-portal";
import RosterAttendanceSnapshot from "@/components/attendance/RosterAttendanceSnapshot";
import {
  emptyCompletion,
  getEventCompletionMap,
} from "@/lib/completion";
import {
  eventSpeakerIds,
  speakerDisplayName,
} from "@/lib/speaker-registration";
import { classifyBridgeEvent, getBridgeHierarchy } from "@/lib/bridge";
export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  requireAdmin(user);

  const sp = await searchParams;
  const eventId = sp.event_id;
  const tab = (sp.tab ?? "participants") as "participants" | "bridge";
  if (!eventId) notFound();

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) notFound();

  const speakerUsers = eventSpeakerIds(event)
    .map((id) => findOne<User>("users", (u) => u.id === id))
    .filter(Boolean) as User[];

  let participants = readDB<Participant>("participants").filter(
    (p) => p.event_id === eventId
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
  const bridgeLabel = classifyBridgeEvent(event);
  const bridgeGroups = getBridgeHierarchy(readDB<Event>("events"));
  const bridgeId = (sp.bridge_id ?? "") || "";
  const bridgeView = bridgeId ? bridgeGroups.find((group) => group.id === bridgeId) : null;
  const completionMap = getEventCompletionMap(eventId);

  function mark(done: boolean) {
    return done ? (
      <span title="Completed" style={{ color: "var(--primary)", fontWeight: 700 }}>
        Yes
      </span>
    ) : (
      <span className="text-muted" title="Not completed">
        —
      </span>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Module Roster</h2>
          <p className="text-muted">
            {event.title} · {typeLabel} · Registered participants and speaker
          </p>
        </div>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <Link href={`/dashboard/participants?event_id=${eventId}&tab=participants`} className={`btn ${tab === "participants" ? "btn-gold" : "btn-secondary"}`}>
            Participants
          </Link>
          {bridgeLabel && (
            <Link href={`/dashboard/participants?event_id=${eventId}&tab=bridge`} className={`btn ${tab === "bridge" ? "btn-gold" : "btn-secondary"}`}>
              Bridge
            </Link>
          )}
          <Link href={`/dashboard/events/email/${eventId}`} className="btn btn-secondary" title="Email registered participants">
            Email
          </Link>
          <Link href={`/dashboard/attendance?event_id=${eventId}`} className="btn btn-gold">
            Attendance
          </Link>
          <Link href="/dashboard/events" className="btn btn-secondary">
            Back to Events
          </Link>
        </div>
      </div>

      {tab === "bridge" && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>
              {bridgeView ? `Bridge: ${bridgeView.label}` : "Bridge events"}
            </h3>
            {bridgeView && (
              <Link href={`/dashboard/participants?event_id=${eventId}&tab=bridge`} className="btn btn-secondary btn-sm">
                Back to bridge list
              </Link>
            )}
          </div>
          <div className="card-body">
            {bridgeView ? (
              <div style={{ display: "grid", gap: "1rem" }}>
                {bridgeView.modules.map((module) => (
                  <div key={`${bridgeView.id}-${module.id}`}>
                    <h4 style={{ margin: "0 0 .75rem", fontSize: "1rem" }}>{module.name}</h4>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: ".5rem" }}>
                      {module.events.map((bridgeEvent) => (
                        <li key={bridgeEvent.id ?? bridgeEvent.title}>
                          <Link href={`/dashboard/participants?event_id=${bridgeEvent.id}`}>
                            {bridgeEvent.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {bridgeGroups.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>
                    No bridge events are currently tagged. Mark a webinar or seminar as a Bridge to display its separate report and roster here.
                  </p>
                ) : (
                  bridgeGroups.map((group) => (
                    <div key={group.id}>
                      <h4 style={{ margin: "0 0 .5rem" }}>{group.label}</h4>
                      <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: ".4rem" }}>
                        {group.modules.map((module) => (
                          <li key={`${group.id}-${module.id}`}>
                            <strong>{module.name}</strong>
                            <ul style={{ margin: ".35rem 0 0", paddingLeft: "1.25rem", display: "grid", gap: ".25rem" }}>
                              {module.events.map((bridgeEvent) => (
                                <li key={bridgeEvent.id ?? bridgeEvent.title}>
                                  <Link href={`/dashboard/participants?event_id=${bridgeEvent.id}&tab=participants`}>
                                    {bridgeEvent.title}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                      <div style={{ marginTop: ".75rem" }}>
                        <Link href={`/dashboard/participants?event_id=${eventId}&tab=bridge&bridge_id=${group.id}`} className="btn btn-secondary btn-sm">
                          Open bridge details
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab !== "bridge" && (
        <>
          {/* Speakers */}
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Speakers / Resource Persons</h3>
            </div>
            <div className="card-body">
              {speakerUsers.length === 0 && !(event.speaker || "").trim() ? (
                <p className="text-muted" style={{ margin: 0 }}>
                  No speaker is linked to this module yet. Edit the event to select
                  one or more.
                </p>
              ) : speakerUsers.length === 0 ? (
                <p style={{ margin: 0, fontWeight: 700 }}>{event.speaker}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {speakerUsers.map((su) => (
                    <div
                      key={su.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "1rem",
                        paddingTop: speakerUsers[0]?.id === su.id ? 0 : "1rem",
                        borderTop:
                          speakerUsers[0]?.id === su.id
                            ? "none"
                            : "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: ".75rem",
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                            color: "var(--gray-500)",
                            marginBottom: ".25rem",
                          }}
                        >
                          Name
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
                          {speakerDisplayName(su)}
                        </div>
                      </div>
                      {su.title_position?.trim() && (
                        <div>
                          <div
                            style={{
                              fontSize: ".75rem",
                              textTransform: "uppercase",
                              letterSpacing: ".04em",
                              color: "var(--gray-500)",
                              marginBottom: ".25rem",
                            }}
                          >
                            Title / Position
                          </div>
                          <div style={{ fontWeight: 600 }}>{su.title_position}</div>
                        </div>
                      )}
                      {su.affiliation?.trim() && (
                        <div>
                          <div
                            style={{
                              fontSize: ".75rem",
                              textTransform: "uppercase",
                              letterSpacing: ".04em",
                              color: "var(--gray-500)",
                              marginBottom: ".25rem",
                            }}
                          >
                            Affiliation
                          </div>
                          <div style={{ fontWeight: 600 }}>{su.affiliation}</div>
                        </div>
                      )}
                      {su.email?.trim() && (
                        <div>
                          <div
                            style={{
                              fontSize: ".75rem",
                              textTransform: "uppercase",
                              letterSpacing: ".04em",
                              color: "var(--gray-500)",
                              marginBottom: ".25rem",
                            }}
                          >
                            Email
                          </div>
                          <div style={{ fontWeight: 600 }}>{su.email}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attendance snapshot */}
          <RosterAttendanceSnapshot
            counts={counts}
            attendanceHref={`/dashboard/attendance?event_id=${eventId}`}
          />

          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Registered Participants</h3>
            </div>
          </div>

          <form method="GET" className="filter-bar">
            <input type="hidden" name="event_id" value={eventId} />
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
              <option value="">All Statuses</option>
              {["registered", "attended", "waitlist", "cancelled"].map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary">
              Filter
            </button>
            <Link
              href={`/dashboard/participants?event_id=${eventId}`}
              className="btn btn-secondary"
            >
              Clear
            </Link>
          </form>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Last Name</th>
                  <th>First Name</th>
                  <th>M.I.</th>
                  <th>Suffix</th>
                  <th>ID Number</th>
                  <th>Age</th>
                  <th>Organization</th>
                  <th>Designation</th>
                  <th>Country</th>
                  <th>Course</th>
                  <th>Year</th>
                  <th>Email</th>
                  <th>Pre</th>
                  <th>Survey</th>
                  <th>Post</th>
                  <th>Quiz</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 && (
                  <tr>
                    <td
                      colSpan={19}
                      className="text-center text-muted"
                      style={{ padding: "2rem" }}
                    >
                      No registered participants found for this module.
                    </td>
                  </tr>
                )}
                {participants.map((p, i) => {
                  const display = composeFullName(p) || p.full_name;
                  const c = completionMap.get(p.id) ?? emptyCompletion();
                  return (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.last_name || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{p.first_name || display}</td>
                      <td>{p.middle_initial || "—"}</td>
                      <td>{p.name_suffix || "—"}</td>
                      <td>{p.student_id}</td>
                      <td>{p.age ?? "—"}</td>
                      <td>{p.organization || "—"}</td>
                      <td>{p.designation || "—"}</td>
                      <td>{p.country || "—"}</td>
                      <td>{p.course}</td>
                      <td>{p.year_level || "—"}</td>
                      <td style={{ fontSize: ".875rem" }}>{p.email}</td>
                      <td style={{ textAlign: "center" }}>{mark(c.pre)}</td>
                      <td style={{ textAlign: "center" }}>{mark(c.survey)}</td>
                      <td style={{ textAlign: "center" }}>{mark(c.post)}</td>
                      <td style={{ textAlign: "center" }}>{mark(c.quiz)}</td>
                      <td>
                        <span className={`badge badge-${p.status}`}>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {p.status === "registered" && (
                          <AttendanceButton participantId={p.id} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
