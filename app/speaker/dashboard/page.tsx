import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Bridge, Event, Participant, Quiz } from "@/lib/types";
import { computeEventStatus, formatDate, formatTime } from "@/lib/utils";
import { isAssignedSpeaker } from "@/lib/speaker-registration";
import { redirect } from "next/navigation";
import Link from "next/link";
import BridgeDashboardSection from "@/components/BridgeDashboardSection";
import { classifyBridgeEvent, getBridgeForEvent } from "@/lib/bridge";

export default async function SpeakerDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard");
  if (user.role !== "organizer") redirect("/student/dashboard");

  let events = readDB<Event>("events");
  let changed = false;
  events = events.map((e) => {
    const s = computeEventStatus(e);
    if (s !== e.status) {
      changed = true;
      return { ...e, status: s };
    }
    return e;
  });
  if (changed) writeDB("events", events);

  const bridges = readDB<Bridge>("bridges").sort((a, b) => a.title.localeCompare(b.title));
  const topics = events
    .filter((e) => isAssignedSpeaker(e, user.id) && !getBridgeForEvent(e, bridges)?.id && !classifyBridgeEvent(e))
    .sort((a, b) =>
      `${b.event_date}T${b.start_time}`.localeCompare(
        `${a.event_date}T${a.start_time}`
      )
    );

  const quizzes = readDB<Quiz>("quizzes");
  const bridgeEventIds = new Set(events
    .filter((event) => getBridgeForEvent(event, bridges) || classifyBridgeEvent(event))
    .map((event) => event.id));
  const myRegs = readDB<Participant>("participants")
    .filter((p) => p.email.toLowerCase() === user.email.toLowerCase())
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at));

  const myEventIds = new Set(myRegs.map((r) => r.event_id));
  const registered = myRegs
    .map((r) => {
      const ev = events.find((e) => e.id === r.event_id);
      return ev && !bridgeEventIds.has(ev.id) ? { ...r, event: ev } : null;
    })
    .filter(Boolean) as (Participant & { event: Event })[];

  const suggested = events
    .filter(
      (e) =>
        e.status === "upcoming" &&
        !bridgeEventIds.has(e.id) &&
        !myEventIds.has(e.id) &&
        !isAssignedSpeaker(e, user.id)
    )
    .slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Speaker Dashboard</h2>
          <p className="text-muted">
            Your assigned topics and quizzes. Profile under Account.
          </p>
        </div>
        <Link href="/speaker/hosted" className="btn btn-gold">
          My Topics
        </Link>
      </div>

      <BridgeDashboardSection
        bridges={bridges}
        events={events}
        registrations={myRegs}
        speakerId={user.id}
        quizzes={quizzes}
      />

      <section style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: ".75rem" }}>My Topics & Quizzes</h3>
        {topics.length === 0 ? (
          <div className="card">
            <div className="card-body text-muted">
              No topics assigned yet. When the secretariat creates an event and
              selects you as speaker, it will appear here so you can build the
              quiz.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {topics.map((ev) => {
              const quiz = quizzes.find((q) => q.event_id === ev.id);
              const qCount = (quiz?.questions ?? []).filter((q) =>
                q.question.trim()
              ).length;
              return (
                <div key={ev.id} className="card">
                  <div
                    className="card-body"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1rem",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: ".5rem",
                          alignItems: "center",
                          marginBottom: ".35rem",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.05rem",
                            fontWeight: 800,
                          }}
                        >
                          {ev.title}
                        </h3>
                        <span className={`badge badge-${ev.status}`}>
                          {ev.status}
                        </span>
                      </div>
                      <p
                        className="text-muted"
                        style={{ margin: 0, fontSize: ".875rem" }}
                      >
                        {formatDate(ev.event_date)} · {formatTime(ev.start_time)}
                        –{formatTime(ev.end_time)} · {ev.category || "General"}
                      </p>
                      <p
                        className="text-muted"
                        style={{ margin: ".35rem 0 0", fontSize: ".875rem" }}
                      >
                        {qCount > 0 ? (
                          <>
                            <strong>{qCount}</strong> quiz question
                            {qCount === 1 ? "" : "s"}
                          </>
                        ) : (
                          "No quiz questions yet"
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/speaker/hosted/${ev.id}?tab=quiz`}
                      className="btn btn-gold btn-sm"
                    >
                      {qCount > 0 ? "Edit Quiz" : "Create Quiz"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 style={{ marginBottom: ".35rem" }}>Registered & Suggested</h3>
        <p className="text-muted" style={{ marginBottom: "1rem", fontSize: ".875rem" }}>
          Events you joined as a participant, plus upcoming sessions you can
          register for.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {registered.map((r) => (
            <div key={r.id} className="card">
              <div className="card-body">
                <span
                  className="badge badge-approved"
                  style={{ marginBottom: ".5rem" }}
                >
                  Registered
                </span>
                <h4 style={{ margin: "0 0 .35rem", fontSize: "1rem" }}>
                  {r.event.title}
                </h4>
                <p className="text-muted" style={{ margin: 0, fontSize: ".8125rem" }}>
                  {formatDate(r.event.event_date)} · {r.status}
                </p>
                <div style={{ marginTop: ".75rem" }}>
                  <Link
                    href={`/speaker/my-events`}
                    className="btn btn-secondary btn-sm"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {suggested.map((ev) => (
            <div key={ev.id} className="card">
              <div className="card-body">
                <span
                  className="badge badge-completed"
                  style={{ marginBottom: ".5rem" }}
                >
                  Suggested
                </span>
                <h4 style={{ margin: "0 0 .35rem", fontSize: "1rem" }}>
                  {ev.title}
                </h4>
                <p className="text-muted" style={{ margin: 0, fontSize: ".8125rem" }}>
                  {formatDate(ev.event_date)} · {ev.category || "General"}
                </p>
                <div style={{ marginTop: ".75rem" }}>
                  <Link
                    href={`/register/${ev.registration_token}`}
                    className="btn btn-gold btn-sm"
                  >
                    Register
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {registered.length === 0 && suggested.length === 0 && (
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card-body text-muted">
                No registered or suggested events yet.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
