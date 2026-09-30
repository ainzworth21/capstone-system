import Link from "next/link";
import { Event, Participant } from "@/lib/types";
import { buildEventCompletionRows, EventCompletionRow, formatStat } from "@/lib/admin-stats";
import { getEventCompletionMap } from "@/lib/completion";

function formatEventTime(row: EventCompletionRow) {
  const date = new Date(`${row.event_date}T00:00:00`).toLocaleDateString("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const format = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };
  return `${date} · ${format(row.start_time)}–${format(row.end_time)}`;
}

export default function BridgeEvaluationMonitor({
  bridgeId,
  events,
  participants,
  searchParams,
}: {
  bridgeId: string;
  events: Event[];
  participants: Participant[];
  searchParams: Record<string, string>;
}) {
  const selectedEventId = events.some((event) => event.id === searchParams.event_id) ? searchParams.event_id : "";
  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const moduleFilter = searchParams.eval_module ?? "";
  const titleSearch = searchParams.eval_search ?? "";
  const rows = buildEventCompletionRows(events).filter((row) => {
    if (moduleFilter && row.category !== moduleFilter) return false;
    if (titleSearch && !row.title.toLowerCase().includes(titleSearch.toLowerCase())) return false;
    return true;
  });
  const modules = [...new Set(events.map((event) => event.category || "General"))].sort((a, b) => a.localeCompare(b));
  const completion = selectedEvent ? getEventCompletionMap(selectedEvent.id) : null;

  return (
    <section>
      <div className="completion-export-row">
        <div>
          <h3 style={{ margin: 0 }}>{selectedEvent ? `Evaluation · ${selectedEvent.title}` : "Bridge Evaluations"}</h3>
          <p className="text-muted" style={{ margin: ".25rem 0 0" }}>Completion data is limited to events in this Bridge.</p>
        </div>
        {selectedEvent && <Link href={`/dashboard/bridges/${bridgeId}?tab=evaluations`} className="btn btn-secondary btn-sm">Back to Bridge Evaluations</Link>}
      </div>

      {!selectedEvent ? (
        <>
          <form method="GET" action={`/dashboard/bridges/${bridgeId}`} className="filter-bar admin-filter-bar">
            <input type="hidden" name="tab" value="evaluations" />
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Module</label>
              <select name="eval_module" className="form-control" defaultValue={moduleFilter}>
                <option value="">All modules</option>
                {modules.map((module) => <option key={module} value={module}>{module}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 220 }}>
              <label className="form-label">Event title</label>
              <input name="eval_search" className="form-control" placeholder="Search Bridge events" defaultValue={titleSearch} />
            </div>
            <button type="submit" className="btn btn-primary">Apply</button>
            <Link href={`/dashboard/bridges/${bridgeId}?tab=evaluations`} className="btn btn-secondary">Reset</Link>
          </form>

          {rows.length === 0 ? <p className="text-muted">No Bridge events match these filters.</p> : (
            <div className="card"><div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Event</th><th>Speaker</th><th>Time</th><th className="num">Regs</th><th className="num">Pre-test</th><th className="num">Post-test</th><th className="num">Quiz</th><th>Actions</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id}>
                  <td><div style={{ fontWeight: 600 }}>{row.title}</div><small className="text-muted">{row.category}</small></td>
                  <td>{row.speaker}</td>
                  <td>{formatEventTime(row)}</td>
                  <td className="num">{row.regs}</td>
                  <td className="num">{formatStat(row.preDone, row.regs)}</td>
                  <td className="num">{formatStat(row.postDone, row.regs)}</td>
                  <td className="num">{formatStat(row.quizDone, row.regs)}</td>
                  <td><div className="action-btns">
                    <Link href={`/dashboard/bridges/${bridgeId}?tab=evaluations&event_id=${row.id}`} className="btn btn-secondary btn-sm bridge-tab-action">View Eval</Link>
                    <a href={`/api/reports/export-eval?event_id=${row.id}&bridge_id=${bridgeId}`} className="btn btn-secondary btn-sm bridge-tab-action">CSV</a>
                    <Link href={`/dashboard/questions?type=quiz&event_id=${row.id}`} className="btn btn-outline-gold btn-sm bridge-tab-action">Edit Quiz</Link>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div></div>
          )}
        </>
      ) : (
        <div className="card"><div className="admin-table-wrap"><table className="admin-table admin-table-compact">
          <thead><tr><th>Name</th><th>Student ID</th><th>Course</th><th>Status</th><th>Pre-test</th><th>Post-test</th><th>Quiz</th></tr></thead>
          <tbody>{participants.filter((participant) => participant.event_id === selectedEvent.id).map((participant) => {
            const flags = completion?.get(participant.id);
            const flag = (value?: boolean) => value ? "Complete" : "Incomplete";
            return <tr key={participant.id}><td>{participant.full_name}</td><td>{participant.student_id}</td><td>{participant.course || "—"}</td><td>{participant.status}</td><td>{flag(flags?.pre)}</td><td>{flag(flags?.post)}</td><td>{flag(flags?.quiz)}</td></tr>;
          })}</tbody>
        </table></div></div>
      )}
    </section>
  );
}
