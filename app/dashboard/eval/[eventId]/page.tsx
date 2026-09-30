import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne, readDB, getUniversalSurvey } from "@/lib/db";
import {
  Event,
  Participant,
  AssessmentResponse,
  SurveyResponse,
  QuizAttempt,
} from "@/lib/types";
import { computeEventStatus, formatDate, formatTime } from "@/lib/utils";
import { buildEventCompletionRows, formatStat } from "@/lib/admin-stats";
import { getEvaluationReadiness } from "@/lib/evaluation-readiness";
import EvaluationNotReady from "@/components/admin/EvaluationNotReady";
import Link from "next/link";

export default async function EvalViewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) notFound();
  if (user.role === "organizer" && event.organizer_id !== user.id) notFound();

  const readiness = getEvaluationReadiness(eventId);
  if (!readiness.ready) {
    return <EvaluationNotReady eventId={eventId} readiness={readiness} />;
  }

  const ev = { ...event, status: computeEventStatus(event) };
  const row = buildEventCompletionRows([ev])[0];

  const participants = readDB<Participant>("participants")
    .filter((p) => p.event_id === eventId && p.status !== "cancelled")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const preMap = new Map(
    readDB<AssessmentResponse>("assessment_responses")
      .filter((r) => r.event_id === eventId)
      .map((r) => [r.participant_id, r])
  );
  const surveyMap = new Map(
    readDB<SurveyResponse>("survey_responses")
      .filter((r) => r.event_id === eventId)
      .map((r) => [r.participant_id, r])
  );
  const quizMap = new Map(
    readDB<QuizAttempt>("quiz_attempts")
      .filter((a) => a.event_id === eventId)
      .map((a) => [a.participant_id, a])
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">View Evaluation</h1>
          <p className="text-muted">{ev.title}</p>
        </div>
        <div className="admin-header-actions">
          <a href={`/api/reports/export-eval?event_id=${eventId}`} className="btn btn-secondary btn-sm">CSV</a>
          <Link href={`/dashboard/questions?type=quiz&event_id=${eventId}`} className="btn btn-outline-gold btn-sm">Edit Quiz</Link>
          <Link href="/dashboard/evaluations" className="btn btn-secondary btn-sm">Back</Link>
        </div>
      </div>

      <div className="admin-kpi-row">
        <div className="admin-kpi">
          <div className="admin-kpi-value">{row.regs}</div>
          <div className="admin-kpi-label">Registrations</div>
        </div>
        <div className="admin-kpi">
          <div className="admin-kpi-value">{formatStat(row.preDone, row.regs)}</div>
          <div className="admin-kpi-label">Pre-Assessment</div>
        </div>
        <div className="admin-kpi">
          <div className="admin-kpi-value">{formatStat(row.postDone, row.regs)}</div>
          <div className="admin-kpi-label">Survey (Post)</div>
        </div>
        <div className="admin-kpi">
          <div className="admin-kpi-value">{formatStat(row.quizDone, row.regs)}</div>
          <div className="admin-kpi-label">Quiz</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem" }}>
          <div><span className="text-muted" style={{ fontSize: ".8rem" }}>Date</span><div style={{ fontWeight: 600 }}>{formatDate(ev.event_date)}</div></div>
          <div><span className="text-muted" style={{ fontSize: ".8rem" }}>Time</span><div style={{ fontWeight: 600 }}>{formatTime(ev.start_time)} – {formatTime(ev.end_time)}</div></div>
          <div><span className="text-muted" style={{ fontSize: ".8rem" }}>Speaker</span><div style={{ fontWeight: 600 }}>{ev.speaker || "—"}</div></div>
          <div><span className="text-muted" style={{ fontSize: ".8rem" }}>Category</span><div style={{ fontWeight: 600 }}>{ev.category}</div></div>
        </div>
        <div className="card-body" style={{ borderTop: "1px solid var(--border)", paddingTop: ".75rem", fontSize: ".8125rem" }}>
          <span className="text-muted">Modules: </span>
          {readiness.preConfigured && <span className="badge badge-approved" style={{ marginRight: ".35rem" }}>Pre-Assessment</span>}
          {readiness.surveyEnabled && readiness.surveyHasQuestions && (
            <span className="badge badge-approved" style={{ marginRight: ".35rem" }}>Post Survey ON</span>
          )}
          {readiness.quizEnabled && readiness.quizHasQuestions && (
            <span className="badge badge-approved">Quiz ON</span>
          )}
          {!readiness.surveyEnabled && !readiness.quizEnabled && !readiness.preConfigured && (
            <span className="text-muted">—</span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Participant Evaluation Status</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Student ID</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th className="num">Pre</th>
                  <th className="num">Survey</th>
                  <th className="num">Quiz</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted" style={{ padding: "2rem" }}>
                      No participants registered.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => {
                    const pre = preMap.get(p.id);
                    const survey = surveyMap.get(p.id);
                    const quizAttempt = quizMap.get(p.id);
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                        <td>{p.student_id}</td>
                        <td>{p.course}</td>
                        <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                        <td className="num">{pre ? "Yes" : "—"}</td>
                        <td className="num">{survey ? "Yes" : "—"}</td>
                        <td className="num">
                          {quizAttempt
                            ? `${quizAttempt.score}%${quizAttempt.passed ? " · Pass" : " · Fail"}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
