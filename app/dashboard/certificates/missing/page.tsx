import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { buildMissingCertificateRows } from "@/lib/missing-certificates";
import Link from "next/link";
import { redirectSpeakerToPortal } from "@/lib/speaker-portal";

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function MissingCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/student/dashboard");
  redirectSpeakerToPortal(user);

  const sp = await searchParams;
  const topic = sp.topic ?? "";
  const eventId = sp.event_id ?? "";

  const report = buildMissingCertificateRows();
  let { rows } = report;
  const { topics, events } = report;

  if (topic) rows = rows.filter((r) => r.topic === topic);
  if (eventId) rows = rows.filter((r) => r.eventId === eventId);

  const eventsForTopic = topic
    ? events.filter((e) => (e.category || "General") === topic)
    : events;

  const exportHref = `/api/reports/export-missing-certs${qs({
    topic: topic || undefined,
    event_id: eventId || undefined,
  })}`;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Missing Certificate</h1>
          <p className="text-muted">
            Attended participants without an issued certificate · {rows.length}{" "}
            record{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a href={exportHref} className="btn btn-secondary btn-sm">
          Export CSV
        </a>
      </div>

      <form method="GET" className="filter-bar admin-filter-bar">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Topic</label>
          <select name="topic" className="form-control" defaultValue={topic}>
            <option value="">All Modules</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 280 }}>
          <label className="form-label">Event</label>
          <select name="event_id" className="form-control" defaultValue={eventId}>
            <option value="">All Events</option>
            {eventsForTopic
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
        <Link href="/dashboard/certificates/missing" className="btn btn-secondary">
          Reset
        </Link>
      </form>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Module</th>
                  <th>Webinar/Seminar</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Staff ID</th>
                  <th>Program</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center text-muted"
                      style={{ padding: "2.5rem" }}
                    >
                      No missing certificates for the selected filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.topic}</td>
                      <td style={{ fontWeight: 600 }}>{r.webinar}</td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td style={{ fontSize: ".8125rem" }}>{r.email}</td>
                      <td>{r.studentId}</td>
                      <td>{r.program}</td>
                      <td style={{ fontSize: ".8125rem" }}>{r.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
