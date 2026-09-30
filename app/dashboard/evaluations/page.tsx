import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Bridge, Event } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import Link from "next/link";
import { buildEventCompletionRows, sortByDateDesc } from "@/lib/admin-stats";
import CompletionTable from "@/components/admin/CompletionTable";
import { redirectSpeakerToPortal } from "@/lib/speaker-portal";
import { getMainEvents } from "@/lib/bridge";

export default async function EvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  redirectSpeakerToPortal(user);
  const sp = await searchParams;

  let allEvents = readDB<Event>("events");
  let changed = false;
  allEvents = allEvents.map((e) => {
    const s = computeEventStatus(e);
    if (s !== e.status) { changed = true; return { ...e, status: s }; }
    return e;
  });
  if (changed) writeDB("events", allEvents);

  allEvents = getMainEvents(allEvents, readDB<Bridge>("bridges"));

  if (user?.role === "organizer") {
    allEvents = allEvents.filter((e) => e.organizer_id === user.id);
  }

  let rows = buildEventCompletionRows(allEvents);

  if (sp.category) {
    rows = rows.filter((r) => r.category === sp.category);
  }
  if (sp.search) {
    const q = sp.search.toLowerCase();
    rows = rows.filter((r) => r.title.toLowerCase().includes(q));
  }

  rows = sortByDateDesc(rows);
  const categories = [...new Set(allEvents.map((e) => e.category || "General"))].sort();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Evaluations — All Events</h1>
          <p className="text-muted">
            Pre-assessment, survey (post), and quiz completion · {rows.length} event{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">
          Back to Dashboard
        </Link>
      </div>

      <form method="GET" className="filter-bar admin-filter-bar">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Topic</label>
          <select name="category" className="form-control" defaultValue={sp.category ?? ""}>
            <option value="">— All Modules —</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 220 }}>
          <label className="form-label">Event (title contains)</label>
          <input
            name="search"
            className="form-control"
            placeholder="e.g. Module 2"
            defaultValue={sp.search ?? ""}
          />
        </div>
        <button type="submit" className="btn btn-primary">Apply</button>
        <Link href="/dashboard/evaluations" className="btn btn-secondary">Reset</Link>
      </form>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <CompletionTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
