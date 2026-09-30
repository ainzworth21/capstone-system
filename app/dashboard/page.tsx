import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Bridge, Event } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import Link from "next/link";
import {
  buildEventCompletionRows,
  buildNeedsAttention,
  sortByDateDesc,
  topByRegistrations,
} from "@/lib/admin-stats";
import CompletionTable from "@/components/admin/CompletionTable";
import NeedsAttentionPanel from "@/components/admin/NeedsAttentionPanel";
import { getMainEvents } from "@/lib/bridge";

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Speakers use the participant portal; only admins see this home
  if (user.role === "organizer") redirect("/speaker/dashboard");
  if (user.role !== "admin") redirect("/login");

  const allEvents = readDB<Event>("events");
  const updatedEvents = allEvents.map((event) => ({
    ...event,
    status: computeEventStatus(event),
  }));
  if (updatedEvents.some((event, index) => event.status !== allEvents[index].status)) {
    writeDB("events", updatedEvents);
  }
  const events = getMainEvents(updatedEvents, readDB<Bridge>("bridges"));

  const rows = buildEventCompletionRows(events);
  const sorted = sortByDateDesc(rows);
  const snapshot = sorted.slice(0, 5);
  const topFive = topByRegistrations(rows, 5);
  const attention = buildNeedsAttention(rows);

  const totalRegs = rows.reduce((s, r) => s + r.regs, 0);
  const surveyOffCount = attention.regsSurveyOff.length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Admin — CvSU Events</h1>
          <p className="text-muted">Welcome back, {user.full_name}</p>
        </div>
      </div>

      <div className="admin-kpi-row">
        <div className="admin-kpi">
          <div className="admin-kpi-value">{surveyOffCount}</div>
          <div className="admin-kpi-label">Events with Survey OFF</div>
        </div>
        <div className="admin-kpi">
          <div className="admin-kpi-value">{totalRegs.toLocaleString()}</div>
          <div className="admin-kpi-label">Total Registrations</div>
        </div>
        <div className="admin-kpi">
          <div className="admin-kpi-value">{events.length}</div>
          <div className="admin-kpi-label">Total Events</div>
        </div>
        <div className="admin-kpi">
          <div className="admin-kpi-value">{rows.filter((r) => r.hasQuizQuestions).length}</div>
          <div className="admin-kpi-label">Events with Quiz Qs</div>
        </div>
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-main-col">
          <div className="card">
            <div className="card-header">
              <h3>Evaluations Snapshot (latest 5 events)</h3>
              <Link href="/dashboard/evaluations" className="btn btn-secondary btn-sm">
                View all
              </Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <CompletionTable rows={snapshot} compact />
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.25rem" }}>
            <div className="card-header">
              <h3>Top 5 Events (by registrations)</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="admin-table admin-table-compact">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th className="num">Regs</th>
                    <th className="num">Pre</th>
                    <th className="num">Post</th>
                    <th className="num">Quiz</th>
                  </tr>
                </thead>
                <tbody>
                  {topFive.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/dashboard/eval/${r.id}`} style={{ fontWeight: 600, color: "var(--primary-dark)" }}>
                          {r.title}
                        </Link>
                      </td>
                      <td className="num">{r.regs}</td>
                      <td className="num">{r.prePct}%</td>
                      <td className="num">{r.postPct}%</td>
                      <td className="num">{r.quizPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <NeedsAttentionPanel
          surveyOnNoQuestions={attention.surveyOnNoQuestions}
          regsSurveyOff={attention.regsSurveyOff}
          quizOnNoQuestions={attention.quizOnNoQuestions}
        />
      </div>
    </div>
  );
}
