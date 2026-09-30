import Link from "next/link";
import { Event } from "@/lib/types";
import {
  buildSurveyResultReport,
  surveyResultCsvHeaders,
  surveyResultToCells,
} from "@/lib/reporting";
import { buildSurveySummaryReport } from "@/lib/summary-report";
import { buildInboundCvsuReport } from "@/lib/inbound-cvsu";
import { buildStarReport } from "@/lib/star-report";
import { SummaryReportView } from "@/components/admin/SummaryReportView";
import { InboundCvsuReportView } from "@/components/admin/InboundCvsuReportView";
import { StarReportView } from "@/components/admin/StarReportView";

type ReportView = "survey" | "summary" | "inbound" | "stars";

function qs(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function BridgeReportsPanel({
  bridgeId,
  bridgeTitle,
  events,
  searchParams,
}: {
  bridgeId: string;
  bridgeTitle: string;
  events: Event[];
  searchParams: Record<string, string>;
}) {
  const requestedView = searchParams.report_view;
  const view: ReportView = requestedView === "summary" || requestedView === "inbound" || requestedView === "stars"
    ? requestedView
    : "survey";
  const moduleFilter = searchParams.topic ?? "";
  const eventId = searchParams.event_id ?? "";
  const startDate = searchParams.start_date ?? "";
  const endDate = searchParams.end_date ?? "";
  const search = searchParams.q ?? "";
  const from = searchParams.from ?? "";
  const to = searchParams.to ?? "";
  const attended = searchParams.attended ?? "";
  const includeAll = searchParams.all === "1";
  const selectedSpeakers = searchParams.speaker ? [searchParams.speaker] : [];
  const modules = [...new Set(events.map((event) => event.category || "General"))].sort((a, b) => a.localeCompare(b));
  const eventsForModule = moduleFilter
    ? events.filter((event) => (event.category || "General") === moduleFilter)
    : events;

  const filterParams = {
    tab: "reports",
    report_view: view,
    topic: moduleFilter || undefined,
    event_id: eventId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    q: search || undefined,
    from: from || undefined,
    to: to || undefined,
    attended: attended || undefined,
    all: includeAll ? "1" : undefined,
    speaker: selectedSpeakers[0],
  };
  const baseHref = `/dashboard/bridges/${bridgeId}`;

  const surveyReport = view === "survey" ? buildSurveyResultReport({
    bridge_id: bridgeId,
    topic: moduleFilter || undefined,
    event_id: eventId || undefined,
    require_cert: !includeAll,
  }) : null;
  const summaryReport = view === "summary" ? buildSurveySummaryReport({
    bridge_id: bridgeId,
    topic: moduleFilter || undefined,
    event_id: eventId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    require_cert: false,
  }) : null;
  const inboundReport = view === "inbound" ? buildInboundCvsuReport({
    bridge_id: bridgeId,
    topic: moduleFilter || undefined,
    event_id: eventId || undefined,
    q: search || undefined,
    from: from || undefined,
    to: to || undefined,
    attended: attended || undefined,
  }) : null;
  const starReport = view === "stars" ? buildStarReport({
    bridge_id: bridgeId,
    topic: moduleFilter || undefined,
    event_id: eventId || undefined,
    speakers: selectedSpeakers.length ? selectedSpeakers : undefined,
  }) : null;

  const surveyExport = `/api/reports/export-survey${qs({
    bridge_id: bridgeId,
    topic: moduleFilter || undefined,
    event_id: eventId || undefined,
    all: includeAll ? "1" : undefined,
  })}`;
  const inboundExport = `/api/reports/export-inbound${qs({
    bridge_id: bridgeId,
    topic: moduleFilter || undefined,
    event_id: eventId || undefined,
    q: search || undefined,
    from: from || undefined,
    to: to || undefined,
    attended: attended || undefined,
  })}`;
  const summaryExport = `/api/reports/export-summary${qs({
    bridge_id: bridgeId,
    topic: moduleFilter || undefined,
    event_id: eventId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })}`;

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <h3 className="admin-title" style={{ fontSize: "1.25rem" }}>{bridgeTitle} · Reports</h3>
          <p className="text-muted">Reports and exports are limited to this Bridge.</p>
        </div>
      </div>

      <div className="report-tabs">
        {([
          ["survey", "Survey Results"],
          ["summary", "Summary"],
          ["inbound", "Inbound CvSU"],
          ["stars", "Star Report"],
        ] as [ReportView, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`${baseHref}${qs({ ...filterParams, report_view: key })}`}
            className={`report-tab ${view === key ? "active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {view !== "stars" && (
        <form method="GET" action={baseHref} className="filter-bar admin-filter-bar">
          <input type="hidden" name="tab" value="reports" />
          <input type="hidden" name="report_view" value={view} />
          {view === "survey" && includeAll && <input type="hidden" name="all" value="1" />}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Module</label>
            <select name="topic" className="form-control" defaultValue={moduleFilter}>
              <option value="">All modules</option>
              {modules.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
            <label className="form-label">Event</label>
            <select name="event_id" className="form-control" defaultValue={eventId}>
              <option value="">All Bridge events</option>
              {eventsForModule.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </div>
          {view === "summary" && <>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Start date</label><input type="date" name="start_date" className="form-control" defaultValue={startDate} /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">End date</label><input type="date" name="end_date" className="form-control" defaultValue={endDate} /></div>
          </>}
          {view === "inbound" && <>
            <div className="form-group" style={{ margin: 0, minWidth: 180 }}><label className="form-label">Search</label><input type="search" name="q" className="form-control" defaultValue={search} placeholder="Name / email / program" /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">From</label><input type="date" name="from" className="form-control" defaultValue={from} /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">To</label><input type="date" name="to" className="form-control" defaultValue={to} /></div>
            {inboundReport && inboundReport.maxAttended > 0 && <div className="form-group" style={{ margin: 0 }}><label className="form-label">Total attended</label><select name="attended" className="form-control" defaultValue={attended}><option value="">All</option>{Array.from({ length: inboundReport.maxAttended }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}</select></div>}
          </>}
          <button type="submit" className="btn btn-primary">Apply</button>
          <Link href={`${baseHref}${qs({ tab: "reports", report_view: view })}`} className="btn btn-secondary">Reset</Link>
        </form>
      )}

      {view === "survey" && surveyReport && <>
        <div className="completion-export-row">
          <a href={surveyExport} className="btn btn-secondary btn-sm">Export Bridge CSV</a>
          <Link href={`${baseHref}${qs({ ...filterParams, all: includeAll ? undefined : "1" })}`} className="btn btn-secondary btn-sm">
            {includeAll ? "Show certificate holders only" : "Include all participants"}
          </Link>
          <span className="text-muted">{surveyReport.rows.length} rows</span>
        </div>
        <p className="report-note">Pre-test, post-test, quiz, and certificate results for this Bridge only.</p>
        <SurveyResultsTable rows={surveyReport.rows} meta={surveyReport.meta} />
      </>}

      {view === "summary" && summaryReport && <>
        <div className="completion-export-row">
          <a href={`${summaryExport}&mode=webinar`} className="btn btn-secondary btn-sm">Export CSV by Seminar / Webinar</a>
          <a href={`${summaryExport}&mode=topic`} className="btn btn-secondary btn-sm">Export CSV by Module</a>
        </div>
        <SummaryReportView report={summaryReport} />
      </>}

      {view === "inbound" && inboundReport && <>
        <div className="completion-export-row"><a href={inboundExport} className="btn btn-secondary btn-sm">Export Bridge CSV</a><span className="text-muted">{inboundReport.students.length} students</span></div>
        <InboundCvsuReportView report={inboundReport} />
      </>}

      {view === "stars" && starReport && <StarReportView
        report={starReport}
        filterAction={baseHref}
        bridgeId={bridgeId}
        hiddenFields={{ tab: "reports", report_view: "stars", bridge_id: bridgeId, ...(moduleFilter ? { topic: moduleFilter } : {}), ...(eventId ? { event_id: eventId } : {}) }}
      />}
    </section>
  );
}

function SurveyResultsTable({
  rows,
  meta,
}: {
  rows: ReturnType<typeof buildSurveyResultReport>["rows"];
  meta: ReturnType<typeof buildSurveyResultReport>["meta"];
}) {
  const headers = surveyResultCsvHeaders(meta);
  return (
    <div className="card"><div className="card-body" style={{ padding: 0 }}><div className="admin-table-wrap"><table className="admin-table report-wide-table">
      <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={headers.length} className="text-center text-muted" style={{ padding: "2.5rem" }}>No Bridge report data for these filters.</td></tr> : rows.map((row, index) => <tr key={`${row.eventId}-${row.email}-${index}`}>{surveyResultToCells(row, meta).map((cell, cellIndex) => <td key={cellIndex}>{cell || "—"}</td>)}</tr>)}</tbody>
    </table></div></div></div>
  );
}
