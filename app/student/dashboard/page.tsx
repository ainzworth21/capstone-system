import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Bridge, Event, Participant, Quiz } from "@/lib/types";
import { computeEventStatus, formatDate, formatTime } from "@/lib/utils";
import { isEventHost } from "@/lib/authz";
import { redirect } from "next/navigation";
import Link from "next/link";
import QRDisplay from "@/app/confirmation/QRDisplay";
import BridgeDashboardSection from "@/components/BridgeDashboardSection";

export default async function StudentDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard");
  if (user.role === "organizer") redirect("/speaker/dashboard");

  const allEvents = readDB<Event>("events");
  let changed = false;
  const events = allEvents.map((e) => {
    const s = computeEventStatus(e);
    if (s !== e.status) {
      changed = true;
      return { ...e, status: s };
    }
    return e;
  });
  if (changed) writeDB("events", events);

  const isSpeaker = user.role === "organizer";

  const myRegs = readDB<Participant>("participants")
    .filter((p) => p.email.toLowerCase() === user.email.toLowerCase())
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at));
  const bridges = readDB<Bridge>("bridges").sort((a, b) => a.title.localeCompare(b.title));

  const upcoming: (Participant & { event: Event })[] = [];
  const past: (Participant & { event: Event })[] = [];

  for (const reg of myRegs) {
    const ev = events.find((e) => e.id === reg.event_id);
    if (!ev) continue;
    const item = { ...reg, event: ev };
    if (["upcoming", "ongoing"].includes(ev.status)) upcoming.push(item);
    else past.push(item);
  }

  const hosted = isSpeaker
    ? events
        .filter((e) => isEventHost(e, user.id))
        .sort((a, b) =>
          `${b.event_date}T${b.start_time}`.localeCompare(
            `${a.event_date}T${a.start_time}`
          )
        )
    : [];

  const quizzes = isSpeaker ? readDB<Quiz>("quizzes") : [];
  const participants = isSpeaker ? readDB<Participant>("participants") : [];

  const myEventIds = new Set(myRegs.map((r) => r.event_id));
  const browseEvents = events
    .filter((e) => e.status === "upcoming" && !myEventIds.has(e.id))
    .slice(0, 4);

  const qrEvents = upcoming.filter(
    (r) => r.status === "registered" && r.attendance_token
  );

  const statCards = isSpeaker
    ? [
        {
          label: "Hosted Events",
          value: hosted.length,
          abbr: "H",
          color: "#fdf6e3",
          iconColor: "var(--gold-dark)",
        },
        {
          label: "My Registrations",
          value: myRegs.length,
          abbr: "R",
          color: "#e8f5ee",
          iconColor: "var(--primary)",
        },
        {
          label: "Upcoming (as guest)",
          value: upcoming.length,
          abbr: "U",
          color: "#e8f5ee",
          iconColor: "var(--primary-mid)",
        },
        {
          label: "Attended",
          value: myRegs.filter((r) => r.status === "attended").length,
          abbr: "A",
          color: "#fdf6e3",
          iconColor: "var(--gold-dark)",
        },
      ]
    : [
        {
          label: "Total Registrations",
          value: myRegs.length,
          abbr: "T",
          color: "#e8f5ee",
          iconColor: "var(--primary)",
        },
        {
          label: "Upcoming Events",
          value: upcoming.length,
          abbr: "U",
          color: "#fdf6e3",
          iconColor: "var(--gold-dark)",
        },
        {
          label: "Events Attended",
          value: myRegs.filter((r) => r.status === "attended").length,
          abbr: "A",
          color: "#e8f5ee",
          iconColor: "var(--primary-mid)",
        },
        {
          label: "On Waitlist",
          value: myRegs.filter((r) => r.status === "waitlist").length,
          abbr: "W",
          color: "#fdf6e3",
          iconColor: "var(--gold-dark)",
        },
      ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{isSpeaker ? "Speaker Dashboard" : "My Dashboard"}</h2>
          <p className="text-muted">Welcome back, {user.full_name}!</p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {isSpeaker && (
            <Link href="/student/hosted/create" className="btn btn-gold">
              + Create Event
            </Link>
          )}
          <Link href="/student/browse" className="btn btn-secondary">
            Browse Events
          </Link>
        </div>
      </div>

      {isSpeaker && (
        <div
          className="card card-gold"
          style={{ marginBottom: "1.5rem" }}
        >
          <div
            className="card-body"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.25rem",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div
                style={{
                  fontSize: ".7rem",
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--gold-dark)",
                  marginBottom: ".35rem",
                }}
              >
                Hosting
              </div>
              <h3 style={{ margin: "0 0 .35rem", fontSize: "1.15rem" }}>
                Manage your webinars &amp; seminars
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: ".9rem" }}>
                You are the speaker on events you create. Add quiz questions,
                edit details, and view your roster anytime.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                flexWrap: "wrap",
                flexShrink: 0,
              }}
            >
              <Link href="/student/hosted" className="btn btn-secondary">
                My Hosted Events ({hosted.length})
              </Link>
              <Link href="/student/hosted/create" className="btn btn-gold">
                + Create Event
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div
              className="stat-icon stat-abbr"
              style={{ background: s.color, color: s.iconColor }}
            >
              {s.abbr}
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {!isSpeaker && (
        <BridgeDashboardSection bridges={bridges} events={events} registrations={myRegs} />
      )}

      {isSpeaker && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <h3>Your Hosted Events</h3>
            <Link href="/student/hosted" className="btn btn-secondary btn-sm">
              View all
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {hosted.length === 0 ? (
              <div className="empty-state" style={{ padding: "2rem" }}>
                <h3>No hosted events yet</h3>
                <p className="text-muted" style={{ marginBottom: "1rem" }}>
                  Create an event to appear here. You will be set as the speaker
                  and added to the roster.
                </p>
                <Link href="/student/hosted/create" className="btn btn-gold btn-sm">
                  Create Event
                </Link>
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {hosted.slice(0, 5).map((ev) => {
                  const quiz = quizzes.find((q) => q.event_id === ev.id);
                  const qCount = (quiz?.questions ?? []).filter((q) =>
                    q.question.trim()
                  ).length;
                  const roster = participants.filter(
                    (p) => p.event_id === ev.id && p.status !== "cancelled"
                  ).length;
                  return (
                    <li
                      key={ev.id}
                      style={{
                        padding: "1rem 1.5rem",
                        borderBottom: "1px solid var(--gray-200)",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "1rem",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{ev.title}</div>
                        <div
                          style={{
                            fontSize: ".8125rem",
                            color: "var(--gray-500)",
                            marginTop: ".2rem",
                          }}
                        >
                          {formatDate(ev.event_date)} ·{" "}
                          {formatTime(ev.start_time)} ·{" "}
                          {ev.event_type === "webinar" ? "Webinar" : "Seminar"} ·{" "}
                          {roster} registered
                          {qCount > 0
                            ? ` · ${qCount} quiz Q`
                            : " · no quiz yet"}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: ".375rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span className={`badge badge-${ev.status}`}>
                          {ev.status}
                        </span>
                        <Link
                          href={`/student/hosted/${ev.id}/edit`}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/student/hosted/${ev.id}?tab=quiz`}
                          className="btn btn-gold btn-sm"
                        >
                          Questions
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="dash-two-col">
        <div className="card card-gold">
          <div className="card-header">
            <h3>
              {isSpeaker ? "Events I Registered For" : "My Upcoming Events"}
            </h3>
            <Link href="/student/my-events" className="btn btn-secondary btn-sm">
              View All
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {upcoming.length === 0 ? (
              <div
                className="text-center text-muted empty-state"
                style={{ padding: "2rem" }}
              >
                <p>No upcoming registrations.</p>
                <Link
                  href="/student/browse"
                  className="btn btn-gold btn-sm"
                  style={{ marginTop: "1rem", display: "inline-flex" }}
                >
                  Browse Events
                </Link>
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {upcoming.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    style={{
                      padding: ".875rem 1.5rem",
                      borderBottom: "1px solid var(--gray-200)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 160px" }}>
                      <div style={{ fontWeight: 600 }}>{r.event.title}</div>
                      <div
                        style={{
                          fontSize: ".8125rem",
                          color: "var(--gray-500)",
                        }}
                      >
                        {formatDate(r.event.event_date)} ·{" "}
                        {r.event.event_type === "webinar"
                          ? r.event.platform_name || "Online"
                          : r.event.location}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: ".375rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {r.event.event_type === "webinar" &&
                        r.event.platform_link && (
                          <a
                            href={r.event.platform_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-sm"
                          >
                            {r.event.platform_name || "Join"}
                          </a>
                        )}
                      <Link
                        href={`/event/${r.event.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Details
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Past Events</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {past.length === 0 ? (
              <div
                className="text-center text-muted"
                style={{ padding: "2rem" }}
              >
                No past events yet.
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {past.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    style={{
                      padding: ".875rem 1.5rem",
                      borderBottom: "1px solid var(--gray-200)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: ".75rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{r.event.title}</div>
                      <div
                        style={{
                          fontSize: ".8125rem",
                          color: "var(--gray-500)",
                        }}
                      >
                        {formatDate(r.event.event_date)}
                      </div>
                    </div>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {browseEvents.length > 0 && (
        <div className="card card-gold" style={{ marginTop: "1.5rem" }}>
          <div className="card-header">
            <h3>Suggested Events</h3>
            <Link href="/student/browse" className="btn btn-secondary btn-sm">
              See All
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {browseEvents.map((ev) => (
                <li
                  key={ev.id}
                  style={{
                    padding: ".875rem 1.5rem",
                    borderBottom: "1px solid var(--gray-200)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{ev.title}</div>
                    <div
                      style={{
                        fontSize: ".8125rem",
                        color: "var(--gray-500)",
                      }}
                    >
                      {formatDate(ev.event_date)} ·{" "}
                      {ev.event_type === "webinar"
                        ? ev.platform_name || "Online"
                        : ev.location}
                    </div>
                  </div>
                  <Link
                    href={`/register/${ev.registration_token}`}
                    className="btn btn-gold btn-sm"
                  >
                    Register
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {qrEvents.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="card-header">
            <h3>Your Attendance</h3>
          </div>
          <div className="card-body">
            <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
              Seminars: show the QR at the entrance. Webinars: confirm when the
              session starts.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1.5rem",
              }}
            >
              {qrEvents.map((r) => (
                <div
                  key={r.id}
                  style={{
                    textAlign: "center",
                    background: "var(--surface-alt)",
                    border: `1px solid ${
                      r.event.event_type === "webinar"
                        ? "var(--gold)"
                        : "var(--border)"
                    }`,
                    borderRadius: "var(--radius-lg)",
                    padding: "1.25rem",
                    minWidth: 200,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: ".5rem",
                      fontSize: ".9375rem",
                    }}
                  >
                    {r.event.title}
                  </div>
                  {r.event.event_type === "webinar" ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: ".625rem",
                      }}
                    >
                      <a
                        href={`/api/attendance/confirm?token=${r.attendance_token}`}
                        className="btn btn-gold btn-sm"
                      >
                        Confirm Attendance
                      </a>
                      {r.event.platform_link && (
                        <a
                          href={r.event.platform_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-gold btn-sm"
                        >
                          Join {r.event.platform_name}
                        </a>
                      )}
                    </div>
                  ) : (
                    <>
                      <QRDisplay token={r.attendance_token} />
                      <div
                        style={{
                          fontSize: ".75rem",
                          color: "var(--gray-500)",
                          marginTop: ".5rem",
                        }}
                      >
                        Show at seminar entrance
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
