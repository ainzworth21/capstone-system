import Link from "next/link";
import { EventCompletionRow, formatStat } from "@/lib/admin-stats";
import { getEvaluationReadiness } from "@/lib/evaluation-readiness";

function formatEventTime(row: EventCompletionRow) {
  const d = new Date(row.event_date + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ap}`;
  };
  return `${d} · ${fmt(row.start_time)} → ${fmt(row.end_time)}`;
}

export default function CompletionTable({
  rows,
  compact = false,
}: {
  rows: EventCompletionRow[];
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="admin-empty">
        <p>No events match your filters.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className={`admin-table ${compact ? "admin-table-compact" : ""}`}>
        <thead>
          <tr>
            <th>Event</th>
            <th>Speaker</th>
            <th>Time</th>
            <th className="num">Regs</th>
            <th className="num">Pre</th>
            <th className="num">Post</th>
            <th className="num">Quiz</th>
            <th className="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const readiness = getEvaluationReadiness(row.id);
            return (
            <tr key={row.id}>
              <td className="event-cell">
                <div className="event-title-cell">{row.title}</div>
                <div className="event-meta-cell">
                  {row.hasQuizQuestions && (
                    <span className="badge badge-approved" style={{ fontSize: ".65rem", padding: ".1rem .45rem" }}>
                      Has Qs
                    </span>
                  )}
                  <span className="text-muted" style={{ fontSize: ".78rem" }}>
                    {row.category}
                  </span>
                </div>
              </td>
              <td>{row.speaker}</td>
              <td className="time-cell">{formatEventTime(row)}</td>
              <td className="num">{row.regs}</td>
              <td className="num">{formatStat(row.preDone, row.regs)}</td>
              <td className="num">{formatStat(row.postDone, row.regs)}</td>
              <td className="num">{formatStat(row.quizDone, row.regs)}</td>
              <td className="actions">
                <div className="action-btns">
                  <Link
                    href={`/dashboard/eval/${row.id}`}
                    className={`btn btn-sm ${readiness.ready ? "btn-outline-primary" : "btn-secondary"}`}
                    title={
                      readiness.ready
                        ? "View evaluation results"
                        : "Evaluation not ready — fix enabled survey/quiz configuration"
                    }
                  >
                    {readiness.ready ? "View Eval" : "Not Ready"}
                  </Link>
                  <a
                    href={`/api/reports/export-eval?event_id=${row.id}`}
                    className="btn btn-sm btn-secondary"
                  >
                    CSV
                  </a>
                  <Link
                    href={`/dashboard/questions?type=quiz&event_id=${row.id}`}
                    className="btn btn-sm btn-outline-gold"
                  >
                    Edit Quiz
                  </Link>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
