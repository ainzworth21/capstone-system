import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
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
import { redirectSpeakerToPortal } from "@/lib/speaker-portal";

function qs(params: Record<string, string | string[] | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v || (Array.isArray(v) && v.length === 0)) continue;
    if (Array.isArray(v)) {
      for (const item of v) sp.append(k, item);
    } else {
      sp.set(k, v);
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

type Tab = "survey" | "summary" | "inbound" | "stars";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/student/dashboard");
  redirectSpeakerToPortal(user);

  const sp = await searchParams;
  const tab = (sp.tab as Tab) || "survey";
  const topic = sp.topic ?? "";
  const eventId = sp.event_id ?? "";
  const startDate = sp.start_date ?? "";
  const endDate = sp.end_date ?? "";
  const inboundQ = sp.q ?? "";
  const inboundFrom = sp.from ?? "";
  const inboundTo = sp.to ?? "";
  const inboundAttended = sp.attended ?? "";
  const rawSpeaker = sp.speaker;
  const starSpeakers = Array.isArray(rawSpeaker)
    ? rawSpeaker
    : rawSpeaker
      ? [rawSpeaker]
      : [];
  const allParticipants = sp.all === "1";

  const filters = {
    topic: topic || undefined,
    event_id: eventId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    organizer_id: user.role === "organizer" ? user.id : undefined,
    require_cert: !allParticipants,
  };

  const summaryFilters = {
    ...filters,
    require_cert: false as const,
  };

  const { rows, meta } = buildSurveyResultReport(filters);
  const eventsForTopic = topic
    ? meta.events.filter((e) => (e.category || "General") === topic)
    : meta.events;

  const filterQs = {
    tab,
    topic: topic || undefined,
    event_id: eventId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    q: inboundQ || undefined,
    from: inboundFrom || undefined,
    to: inboundTo || undefined,
    attended: inboundAttended || undefined,
    speaker: starSpeakers.length ? starSpeakers : undefined,
    all: allParticipants ? "1" : undefined,
  };

  const exportHref = `/api/reports/export-survey${qs({
    topic: topic || undefined,
    event_id: eventId || undefined,
    all: allParticipants ? "1" : undefined,
  })}`;

  const inboundExportHref = `/api/reports/export-inbound${qs({
    topic: topic || undefined,
    event_id: eventId || undefined,
    q: inboundQ || undefined,
    from: inboundFrom || undefined,
    to: inboundTo || undefined,
    attended: inboundAttended || undefined,
  })}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "survey", label: "Survey Results per Participant" },
    { key: "summary", label: "Summary" },
    { key: "inbound", label: "Inbound CvSU Students" },
    { key: "stars", label: "Star Report" },
  ];

  const summaryExportBase = `/api/reports/export-summary${qs({
    topic: topic || undefined,
    event_id: eventId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })}`;

  const summary =
    tab === "summary" ? buildSurveySummaryReport(summaryFilters) : null;
  const inboundReport =
    tab === "inbound"
      ? buildInboundCvsuReport({
          topic: topic || undefined,
          event_id: eventId || undefined,
          organizer_id: user.role === "organizer" ? user.id : undefined,
          q: inboundQ || undefined,
          from: inboundFrom || undefined,
          to: inboundTo || undefined,
          attended: inboundAttended || undefined,
        })
      : null;
  const starReport =
    tab === "stars"
      ? buildStarReport({
          topic: topic || undefined,
          event_id: eventId || undefined,
          organizer_id: user.role === "organizer" ? user.id : undefined,
          speakers: starSpeakers.length ? starSpeakers : undefined,
        })
      : null;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Reporting</h1>
          <p className="text-muted">
            Pre-assessment, post-survey, quiz, and certificate results
          </p>
        </div>
      </div>

      <div className="report-tabs">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/reports${qs({ ...filterQs, tab: t.key })}`}
            className={`report-tab ${tab === t.key ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="filter-bar admin-filter-bar">
        <input type="hidden" name="tab" value={tab} />
        {allParticipants && <input type="hidden" name="all" value="1" />}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Module</label>
          <select name="topic" className="form-control" defaultValue={topic}>
            <option value="">— All modules —</option>
            {meta.topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 260 }}>
          <label className="form-label">Event</label>
          <select name="event_id" className="form-control" defaultValue={eventId}>
            <option value="">— All events (by module) —</option>
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
        {tab === "summary" && (
          <>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Start date</label>
              <input
                type="date"
                name="start_date"
                className="form-control"
                defaultValue={startDate}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">End date</label>
              <input
                type="date"
                name="end_date"
                className="form-control"
                defaultValue={endDate}
              />
            </div>
          </>
        )}
        {tab === "inbound" && (
          <>
            <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
              <label className="form-label">Search</label>
              <input
                type="search"
                name="q"
                className="form-control"
                placeholder="Name / email / program"
                defaultValue={inboundQ}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Completed from</label>
              <input
                type="date"
                name="from"
                className="form-control"
                defaultValue={inboundFrom}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Completed to</label>
              <input
                type="date"
                name="to"
                className="form-control"
                defaultValue={inboundTo}
              />
            </div>
            {inboundReport && inboundReport.maxAttended > 0 && (
              <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                <label className="form-label">Filter by total attended</label>
                <select
                  name="attended"
                  className="form-control"
                  defaultValue={inboundAttended}
                >
                  <option value="">Show all</option>
                  {Array.from(
                    { length: inboundReport.maxAttended },
                    (_, i) => i + 1
                  ).map((n) => (
                    <option key={n} value={String(n)}>
                      {n} event{n !== 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        <button type="submit" className="btn btn-primary">
          Apply
        </button>
        <Link href={`/dashboard/reports?tab=${tab}`} className="btn btn-secondary">
          Reset
        </Link>
      </form>

      {(tab === "survey" || tab === "inbound") && (
        <div className="completion-export-row">
          <a
            href={tab === "inbound" ? inboundExportHref : exportHref}
            className="btn btn-sm btn-secondary"
          >
            Export CSV
          </a>
          {tab === "survey" && (
            <Link
              href={`/dashboard/reports${qs({
                ...filterQs,
                all: allParticipants ? undefined : "1",
              })}`}
              className="btn btn-sm btn-secondary"
            >
              {allParticipants
                ? "Show certificate holders only"
                : "Include all participants"}
            </Link>
          )}
          <span className="text-muted" style={{ fontSize: ".8125rem" }}>
            {tab === "inbound"
              ? inboundReport?.students.length ?? 0
              : rows.length}{" "}
            row{(tab === "inbound"
              ? inboundReport?.students.length ?? 0
              : rows.length) !== 1
              ? "s"
              : ""}
          </span>
        </div>
      )}

      {tab === "survey" && (
        <>
          <p className="report-note">
            <strong>Note:</strong> This list includes only participants who have a
            certificate record (toggle above to include all). Pre answers come from
            pre-assessment; post answers from the global survey (mapped to P1/P2);
            quiz shows the latest attempt per participant.
          </p>
          <SurveyResultsTable rows={rows} meta={meta} />
        </>
      )}

      {tab === "summary" && summary && (
        <>
          <div className="completion-export-row">
            <a
              href={`${summaryExportBase}&mode=webinar`}
              className="btn btn-sm btn-secondary"
            >
                Export CSV (By Webinar/Seminar)
            </a>
            <a
              href={`${summaryExportBase}&mode=topic`}
              className="btn btn-sm btn-secondary"
            >
              Export CSV (By Module)
            </a>
          </div>
          <SummaryReportView report={summary} />
        </>
      )}

      {tab === "inbound" && (
        <>
          <p className="report-note">
            Inbound CvSU Students: attendance summary filtered to participants
            whose institution/organization/email indicates Cavite State
            University.
          </p>
          {inboundReport && <InboundCvsuReportView report={inboundReport} />}
        </>
      )}

      {tab === "stars" && starReport && (
        <>
          <div className="admin-page-header" style={{ marginBottom: "1rem" }}>
            <div>
              <h2 className="summary-section-title" style={{ margin: 0 }}>
                Webinar/Seminar Learning Report
              </h2>
              <p className="text-muted" style={{ margin: ".35rem 0 0", fontSize: ".875rem" }}>
                Per-module quiz analysis and pre vs post learning (Likert Q1–Q5).
              </p>
            </div>
          </div>
          <StarReportView
            report={starReport}
            filterAction="/dashboard/reports"
            hiddenFields={{
              tab: "stars",
              ...(topic ? { topic } : {}),
              ...(eventId ? { event_id: eventId } : {}),
            }}
          />
        </>
      )}

    </div>
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
    <div className="card">
      <div className="card-body" style={{ padding: 0 }}>
        <div className="admin-table-wrap">
          <table className="admin-table report-wide-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="text-center text-muted"
                    style={{ padding: "2.5rem" }}
                  >
                    No data found for the selected filter.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const cells = surveyResultToCells(r, meta);
                  return (
                    <tr key={`${r.eventId}-${r.email}-${i}`}>
                      {cells.map((cell, ci) => (
                        <td
                          key={ci}
                          style={{
                            whiteSpace: ci >= 4 ? "nowrap" : undefined,
                            fontSize: ci === 3 ? ".78rem" : undefined,
                            fontWeight:
                              ci === 2 ? 600 : undefined,
                          }}
                          className={
                            /^(Pre Q|Quiz|P2|P1)/.test(headers[ci] ?? "") &&
                            cell &&
                            cell !== "—"
                              ? "num"
                              : undefined
                          }
                        >
                          {cell || "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
