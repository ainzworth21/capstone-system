"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SeedDemoButton from "@/components/events/SeedDemoButton";

export interface ManagedEventRow {
  id: string;
  shortId: number;
  title: string;
  description: string;
  speaker: string;
  category: string;
  event_type: "webinar" | "seminar";
  event_date: string;
  start_time: string;
  end_time: string;
  status: string;
  platform_link: string;
  platform_name: string;
  location: string;
  quizActive: boolean;
  participantCount: number;
}

function formatStartEnd(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  return d
    .toLocaleString("en-PH", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

function buildHref(
  base: string,
  opts: { category?: string; search?: string; type?: string }
) {
  const p = new URLSearchParams();
  if (opts.category) p.set("category", opts.category);
  if (opts.search) p.set("search", opts.search);
  if (opts.type) p.set("type", opts.type);
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}

export default function EventsManager({
  events,
  categories,
  surveyActive,
  activeCategory,
  activeType,
  search,
  isAdmin = true,
  totalEventCount = 0,
}: {
  events: ManagedEventRow[];
  categories: string[];
  surveyActive: boolean;
  activeCategory: string;
  activeType: string;
  search: string;
  isAdmin?: boolean;
  totalEventCount?: number;
}) {
  const router = useRouter();

  async function toggleSurvey() {
    const res = await fetch("/api/settings/survey");
    const current = await res.json();
    await fetch("/api/settings/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_active: !surveyActive,
        questions: current?.questions ?? [],
      }),
    });
    router.refresh();
  }

  async function toggleQuiz(row: ManagedEventRow) {
    const res = await fetch(`/api/quiz/${row.id}`);
    const quiz = await res.json();
    await fetch(`/api/quiz/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_active: !row.quizActive,
        passing_score: quiz?.passing_score ?? 70,
        questions: quiz?.questions ?? [],
      }),
    });
    router.refresh();
  }

  async function deleteEvent(row: ManagedEventRow) {
    if (!confirm(`Cancel event "${row.title}"?`)) return;
    await fetch(`/api/events/${row.id}`, { method: "DELETE" });
    router.refresh();
  }

  const groups = categories
    .map((cat) => ({
      category: cat,
      items: events.filter((e) => e.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  const orphanCats = [...new Set(events.map((e) => e.category))]
    .filter((c) => !categories.includes(c))
    .map((cat) => ({
      category: cat,
      items: events.filter((e) => e.category === cat),
    }));

  const allGroups = [...groups, ...orphanCats].sort((a, b) =>
    a.category.localeCompare(b.category)
  );

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Events</h1>
          <p className="text-muted">
            Webinars and seminars grouped by module
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {isAdmin && (
            <button
              type="button"
              className={`btn btn-sm ${surveyActive ? "btn-survey-on" : "btn-survey-off"}`}
              onClick={toggleSurvey}
              title="Post survey for all events"
            >
              Survey {surveyActive ? "ON" : "OFF"}
            </button>
          )}
          {isAdmin && <SeedDemoButton eventCount={totalEventCount} />}
          <Link href="/dashboard/events/create" className="btn btn-gold btn-sm">
            + New Event
          </Link>
        </div>
      </div>

      <div className="webinars-filter-card card">
        <div className="card-body">
          <div
            className="webinars-topic-pills"
            style={{ marginBottom: ".75rem" }}
          >
            <Link
              href={buildHref("/dashboard/events", {
                search,
                type: activeType,
              })}
              className={`topic-pill ${!activeCategory ? "active" : ""}`}
            >
              All Modules
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={buildHref("/dashboard/events", {
                  category: cat,
                  search,
                  type: activeType,
                })}
                className={`topic-pill ${activeCategory === cat ? "active" : ""}`}
              >
                {cat}
              </Link>
            ))}
          </div>

          <div
            className="webinars-topic-pills"
            style={{ marginBottom: "1rem" }}
          >
            {[
              { key: "", label: "All Types" },
              { key: "webinar", label: "Webinar" },
              { key: "seminar", label: "Seminar" },
            ].map((t) => (
              <Link
                key={t.key || "all"}
                href={buildHref("/dashboard/events", {
                  category: activeCategory,
                  search,
                  type: t.key,
                })}
                className={`topic-pill ${activeType === t.key ? "active" : ""}`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <form method="GET" className="webinars-search-row">
            {activeCategory && (
              <input type="hidden" name="category" value={activeCategory} />
            )}
            {activeType && (
              <input type="hidden" name="type" value={activeType} />
            )}
            <input
              name="search"
              className="form-control"
              placeholder="Search title, module, or speaker"
              defaultValue={search}
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
        </div>
      </div>

      {allGroups.length === 0 ? (
        <div className="card">
          <div
            className="card-body text-center text-muted"
            style={{ padding: "3rem" }}
          >
            No events found.
          </div>
        </div>
      ) : (
        allGroups.map((g) => (
          <div key={g.category} className="webinars-group card">
            <div className="webinars-group-header">{g.category}</div>
            <div className="admin-table-wrap">
              <table className="admin-table webinars-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Speaker</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.shortId}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ev.title}</div>
                        <div style={{ marginTop: ".25rem" }}>
                          <span
                            style={{
                              fontSize: ".7rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              color:
                                ev.event_type === "webinar"
                                  ? "var(--primary)"
                                  : "var(--gold-dark)",
                              background:
                                ev.event_type === "webinar"
                                  ? "var(--primary-light)"
                                  : "var(--gold-light)",
                              padding: ".15rem .45rem",
                              borderRadius: "2rem",
                              border: `1px solid ${
                                ev.event_type === "webinar"
                                  ? "#b8ddc8"
                                  : "var(--gold-mid)"
                              }`,
                            }}
                          >
                            {ev.event_type === "webinar"
                              ? "Webinar"
                              : "Seminar"}
                          </span>
                        </div>
                        {ev.description && (
                          <div
                            className="text-muted"
                            style={{
                              fontSize: ".78rem",
                              marginTop: ".25rem",
                            }}
                          >
                            {ev.description.slice(0, 80)}
                            {ev.description.length > 80 ? "…" : ""}
                          </div>
                        )}
                        {ev.event_type === "webinar" && ev.platform_link ? (
                          <a
                            href={ev.platform_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: ".8125rem",
                              fontWeight: 600,
                              color: "#1a6b8a",
                            }}
                          >
                            Join link
                          </a>
                        ) : ev.event_type === "seminar" && ev.location ? (
                          <div
                            className="text-muted"
                            style={{ fontSize: ".8125rem" }}
                          >
                            {ev.location}
                          </div>
                        ) : null}
                      </td>
                      <td>{ev.speaker || "—"}</td>
                      <td
                        style={{ whiteSpace: "nowrap", fontSize: ".8125rem" }}
                      >
                        {formatStartEnd(ev.event_date, ev.start_time)}
                      </td>
                      <td
                        style={{ whiteSpace: "nowrap", fontSize: ".8125rem" }}
                      >
                        {formatStartEnd(ev.event_date, ev.end_time)}
                      </td>
                      <td>
                        <span className={`badge badge-${ev.status}`}>
                          {ev.status === "completed"
                            ? "Complete"
                            : ev.status.charAt(0).toUpperCase() +
                              ev.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="webinars-actions">
                          <Link
                            href={`/dashboard/events?edit=${ev.id}`}
                            className="btn btn-sm btn-secondary"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/dashboard/participants?event_id=${ev.id}`}
                            className="btn btn-sm btn-primary"
                            title="View module roster"
                          >
                            Roster ({ev.participantCount})
                          </Link>
                          <Link
                            href={`/dashboard/events/email/${ev.id}`}
                            className="btn btn-sm btn-secondary"
                            title="Email registered participants"
                          >
                            Email
                          </Link>
                          <button
                            type="button"
                            className={`btn btn-sm ${ev.quizActive ? "btn-survey-on" : "btn-survey-off"}`}
                            onClick={() => toggleQuiz(ev)}
                            title="Toggle quiz for this event"
                          >
                            Quiz {ev.quizActive ? "ON" : "OFF"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteEvent(ev)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
