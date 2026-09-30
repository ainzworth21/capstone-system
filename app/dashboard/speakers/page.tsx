import { getSessionUser } from "@/lib/session";
import { getSpeakers } from "@/lib/speakers";
import { redirect } from "next/navigation";
import Link from "next/link";
import InviteSpeakerPanel from "./InviteSpeakerPanel";

export default async function SpeakersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  let speakers = getSpeakers();

  if (sp.active === "yes") speakers = speakers.filter((s) => s.speaker_active);
  if (sp.active === "no") speakers = speakers.filter((s) => !s.speaker_active);
  if (sp.q) {
    const q = sp.q.toLowerCase();
    speakers = speakers.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.affiliation.toLowerCase().includes(q) ||
        s.title_position.toLowerCase().includes(q)
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Speakers & Their Events</h1>
          <p className="text-muted">
            {speakers.length} speaker{speakers.length !== 1 ? "s" : ""} · invite
            by email · they sign in at /login/speaker
          </p>
        </div>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <a href="/api/reports/export-speakers" className="btn btn-secondary">
            Export CSV
          </a>
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <InviteSpeakerPanel />
      </div>

      <form method="GET" className="filter-bar admin-filter-bar">
        <input
          name="q"
          className="form-control"
          placeholder="Search name, email, affiliation…"
          defaultValue={sp.q ?? ""}
          style={{ minWidth: 240 }}
        />
        <select name="active" className="form-control" defaultValue={sp.active ?? ""}>
          <option value="">All</option>
          <option value="yes">Active only</option>
          <option value="no">Inactive only</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
        <Link href="/dashboard/speakers" className="btn btn-secondary">
          Reset
        </Link>
      </form>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table speakers-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Title / Position</th>
                  <th>Affiliation</th>
                  <th>Email</th>
                  <th>Active</th>
                  <th>Events (Modules)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {speakers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center text-muted"
                      style={{ padding: "2.5rem" }}
                    >
                      No speakers found.
                    </td>
                  </tr>
                ) : (
                  speakers.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700 }}>{s.full_name}</td>
                      <td>{s.title_position || "—"}</td>
                      <td>{s.affiliation || "—"}</td>
                      <td style={{ fontSize: ".8125rem" }}>{s.email}</td>
                      <td>
                        <span
                          className={`badge ${s.speaker_active ? "badge-approved" : "badge-rejected"}`}
                        >
                          {s.speaker_active ? "Yes" : "No"}
                        </span>
                        {s.account_status === "pending" && (
                          <span
                            className="badge badge-pending"
                            style={{ marginLeft: ".35rem", fontSize: ".65rem" }}
                          >
                            pending ID
                          </span>
                        )}
                      </td>
                      <td className="speaker-events-cell">
                        {s.events.length === 0 ? (
                          <span className="text-muted">No events yet</span>
                        ) : (
                          <ul className="speaker-event-list">
                            {s.events.map((ev) => (
                              <li key={ev.id} className="speaker-event-item">
                                <div className="speaker-event-title">
                                  {ev.title}
                                  {ev.quizSet ? (
                                    <span className="badge badge-approved speaker-set-badge">
                                      Set
                                    </span>
                                  ) : (
                                    <span className="badge badge-pending speaker-set-badge">
                                      No quiz
                                    </span>
                                  )}
                                </div>
                                <div className="speaker-event-meta">
                                  {ev.event_date_label}
                                  <span className="text-muted">
                                    {" "}
                                    · {ev.event_type} · {ev.category}
                                  </span>
                                </div>
                                <div className="speaker-event-btns">
                                  <Link
                                    href={`/dashboard/questions?type=quiz&event_id=${ev.id}`}
                                    className="btn btn-sm btn-outline-primary"
                                  >
                                    Edit Quiz
                                  </Link>
                                  <Link
                                    href={`/dashboard/speakers/preview/${ev.id}`}
                                    className="btn btn-sm btn-secondary"
                                  >
                                    View Questions
                                  </Link>
                                </div>
                              </li>
                            ))}
                            <li className="speaker-sets-footer">
                              Sets created: {s.quizSetsDone} / {s.quizSetsTotal}
                              {s.quizSetsDone === s.quizSetsTotal &&
                                s.quizSetsTotal > 0 && (
                                  <span className="badge badge-approved" style={{ marginLeft: ".4rem" }}>
                                    All sets
                                  </span>
                                )}
                            </li>
                          </ul>
                        )}
                      </td>
                      <td className="actions">
                        <div className="action-btns" style={{ flexDirection: "column" }}>
                          <Link
                            href={`/dashboard/speakers/${s.id}/edit`}
                            className="btn btn-sm btn-primary"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/dashboard/speakers/${s.id}/questions`}
                            className="btn btn-sm btn-secondary"
                          >
                            All Questions by this Speaker
                          </Link>
                        </div>
                      </td>
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
