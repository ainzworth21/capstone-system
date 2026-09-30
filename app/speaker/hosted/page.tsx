import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Event, Quiz } from "@/lib/types";
import { computeEventStatus, formatDate, formatTime } from "@/lib/utils";
import { isAssignedSpeaker } from "@/lib/speaker-registration";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MyTopicsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "organizer") redirect("/speaker/dashboard");

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

  const topics = events
    .filter((e) => isAssignedSpeaker(e, user.id))
    .sort((a, b) =>
      `${b.event_date}T${b.start_time}`.localeCompare(
        `${a.event_date}T${a.start_time}`
      )
    );

  const quizzes = readDB<Quiz>("quizzes");

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Topics</h2>
          <p className="text-muted">
            Topics assigned to you by the secretariat. Open a topic to create or
            edit its quiz.
          </p>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="card">
          <div className="card-body empty-state" style={{ padding: "2.5rem" }}>
            <h3 style={{ marginBottom: ".5rem" }}>No topics assigned</h3>
            <p className="text-muted" style={{ margin: 0 }}>
              When an admin creates a webinar or seminar and selects you as
              speaker, it will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
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
                    gap: "1.25rem",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: ".5rem",
                        alignItems: "center",
                        marginBottom: ".5rem",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontWeight: 800,
                        }}
                      >
                        {ev.title}
                      </h3>
                      <span className={`badge badge-${ev.status}`}>
                        {ev.status}
                      </span>
                      <span className="badge badge-approved">
                        {ev.event_type === "webinar" ? "Webinar" : "Seminar"}
                      </span>
                    </div>
                    <p
                      className="text-muted"
                      style={{ margin: "0 0 .75rem", fontSize: ".875rem" }}
                    >
                      {formatDate(ev.event_date)} · {formatTime(ev.start_time)}–
                      {formatTime(ev.end_time)}
                      {ev.event_type === "webinar"
                        ? ` · ${ev.platform_name || "Online"}`
                        : ` · ${ev.location || "Venue TBA"}`}
                      {" · "}
                      {ev.category || "General"}
                    </p>
                    <p style={{ margin: 0, fontSize: ".875rem" }}>
                      {qCount > 0 ? (
                        <>
                          <strong>{qCount}</strong>{" "}
                          <span className="text-muted">quiz questions</span>
                        </>
                      ) : (
                        <span className="text-muted">No quiz questions yet</span>
                      )}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: ".5rem",
                      flexShrink: 0,
                    }}
                  >
                    <Link
                      href={`/speaker/hosted/${ev.id}?tab=quiz`}
                      className="btn btn-gold btn-sm"
                    >
                      {qCount > 0 ? "Edit Quiz" : "Create Quiz"}
                    </Link>
                    <Link
                      href={`/speaker/hosted/${ev.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Open topic
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
