"use client";

import { Fragment, useState } from "react";
import { StarReport, StarEventReport, StarQuizQuestion, StarPrePostRow } from "@/lib/star-report";

function fmt(n: number | null, digits = 2): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function QuizDistributionChart({ question }: { question: StarQuizQuestion }) {
  const max = Math.max(1, ...question.options.map((o) => o.count));
  const chartHeight = 140;

  return (
    <div className="star-quiz-chart-card">
      <h4 className="star-chart-title">{question.question}</h4>
      <p className="star-chart-sub">
        Number of answers per option. The correct option is highlighted.
      </p>
      <div className="star-quiz-chart-area">
        {question.options.map((opt) => {
          const h = (opt.count / max) * chartHeight;
          return (
            <div key={opt.label} className="star-quiz-chart-col">
              <div className="star-quiz-bars" style={{ height: chartHeight }}>
                {opt.count > 0 && (
                  <div
                    className={`star-quiz-bar ${opt.isCorrect ? "correct" : ""}`}
                    style={{ height: `${h}px` }}
                  >
                    <span className="star-bar-label">{opt.count}</span>
                  </div>
                )}
              </div>
              <div className="star-quiz-xlabel">{opt.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrePostLikertChart({ row }: { row: StarPrePostRow }) {
  const max = Math.max(1, ...row.preCounts, ...row.postCounts);
  const chartHeight = 120;

  return (
    <div className="star-prepost-chart-card">
      <h4 className="star-chart-title">
        <strong>{row.label}:</strong> {row.question} — Pre vs Post (Likert 1–5)
      </h4>
      <div className="star-prepost-legend">
        <span><span className="star-swatch pre" /> Pre</span>
        <span><span className="star-swatch post" /> Post</span>
      </div>
      <div className="star-prepost-chart-area">
        {[1, 2, 3, 4, 5].map((rating) => {
          const idx = rating - 1;
          const pre = row.preCounts[idx];
          const post = row.postCounts[idx];
          return (
            <div key={rating} className="star-prepost-chart-col">
              <div className="star-prepost-bars" style={{ height: chartHeight }}>
                {pre > 0 && (
                  <div
                    className="star-prepost-bar pre"
                    style={{ height: `${(pre / max) * chartHeight}px` }}
                  >
                    <span className="star-bar-label">{pre}</span>
                  </div>
                )}
                {post > 0 && (
                  <div
                    className="star-prepost-bar post"
                    style={{ height: `${(post / max) * chartHeight}px` }}
                  >
                    <span className="star-bar-label">{post}</span>
                  </div>
                )}
              </div>
              <div className="star-quiz-xlabel">{rating}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StarEventSection({ event, bridgeId }: { event: StarEventReport; bridgeId?: string }) {
  const [open, setOpen] = useState(true);
  const typeLabel = event.eventType === "webinar" ? "Webinar" : "Seminar";
  const hasQuiz = event.quizQuestions.length > 0;

  return (
    <div className="star-event-panel">
      <div className="star-event-header">
        <button
          type="button"
          className="star-event-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="star-event-title">
            {event.title}
            <span className="star-event-meta">
              Module: {event.topic} | Date: {event.displayDate} | Speaker:{" "}
              {event.speaker} | {typeLabel}
            </span>
          </span>
          <span className="star-event-chevron">{open ? "▾" : "▸"}</span>
        </button>
        <a
          href={`/api/reports/export-star?event_id=${encodeURIComponent(event.eventId)}${bridgeId ? `&bridge_id=${encodeURIComponent(bridgeId)}` : ""}`}
          className="btn btn-sm btn-secondary star-event-csv"
        >
          Download CSV (this {typeLabel.toLowerCase()})
        </a>
      </div>

      {open && (
        <div className="star-event-body">
          <h3 className="star-section-label">A. Quiz Questions</h3>
          {!hasQuiz ? (
            <p className="report-note" style={{ marginBottom: "1.25rem" }}>
              No quiz questions configured for this {typeLabel.toLowerCase()} yet.
              Add them under Manage Event → Quiz.
            </p>
          ) : (
            <>
              <div className="card" style={{ marginBottom: "1.25rem" }}>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th className="num">Q#</th>
                          <th>Question</th>
                          <th>Options (correct)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.quizQuestions.map((q) => (
                          <tr key={q.index}>
                            <td className="num">{q.index}</td>
                            <td>{q.question}</td>
                            <td>
                              <ul className="star-option-list">
                                {q.options.map((opt) => (
                                  <li
                                    key={opt.label}
                                    className={
                                      opt.isCorrect ? "star-option-correct" : ""
                                    }
                                  >
                                    <strong>{opt.label}.</strong> {opt.text}
                                    {opt.isCorrect && " (correct)"}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <h3 className="star-section-label">
                Quiz Answer Distribution (per question)
              </h3>
              <div className="star-quiz-charts-grid">
                {event.quizQuestions.map((q) => (
                  <QuizDistributionChart key={q.index} question={q} />
                ))}
              </div>
            </>
          )}

          <div className="card" style={{ margin: "1.25rem 0" }}>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="num">0–49</th>
                      <th className="num">50–69</th>
                      <th className="num">70–84</th>
                      <th className="num">85–100</th>
                      <th className="num">Attempts</th>
                      <th className="num">Average %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="num">{event.quizSummary.band0_49}</td>
                      <td className="num">{event.quizSummary.band50_69}</td>
                      <td className="num">{event.quizSummary.band70_84}</td>
                      <td className="num">{event.quizSummary.band85_100}</td>
                      <td className="num">{event.quizSummary.attempts}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {fmt(event.quizSummary.averagePct)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <h3 className="star-section-label">
            B. Pre-Assessment vs Post Assessment (Likert Q1–Q5)
          </h3>
          <p className="report-note" style={{ marginBottom: "1rem" }}>
            Pre-assessment responses: {event.preRespondents} · Post assessment
            (P2) responses: {event.postRespondents} · Paired:{" "}
            {event.pairedRespondents}
          </p>
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th className="num">Pre (Mean)</th>
                      <th className="num">Post (Mean)</th>
                      <th className="num">Δ (Post–Pre)</th>
                      <th className="num">Respondents (paired)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.prePostLearning.map((row) => (
                      <tr key={row.label}>
                        <td style={{ fontSize: ".8125rem", maxWidth: 420 }}>
                          <strong>{row.label}.</strong> {row.question}
                        </td>
                        <td className="num">{fmt(row.preMean)}</td>
                        <td className="num">{fmt(row.postMean)}</td>
                        <td className="num">{fmt(row.delta)}</td>
                        <td className="num">{row.pairedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="report-note" style={{ marginBottom: "1rem" }}>
            Distribution of responses (counts) for Pre vs Post by Likert scale
            (1–5).
          </p>
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Phase</th>
                      <th className="num">1</th>
                      <th className="num">2</th>
                      <th className="num">3</th>
                      <th className="num">4</th>
                      <th className="num">5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.prePostLearning.map((row) => (
                      <Fragment key={row.label}>
                        <tr>
                          <td rowSpan={2} style={{ fontSize: ".8125rem" }}>
                            <strong>{row.label}</strong>
                          </td>
                          <td>Pre</td>
                          {row.preCounts.map((c, i) => (
                            <td key={i} className="num">
                              {c}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td>Post</td>
                          {row.postCounts.map((c, i) => (
                            <td key={i} className="num">
                              {c}
                            </td>
                          ))}
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="star-prepost-charts-grid">
            {event.prePostLearning.map((row) => (
              <PrePostLikertChart key={row.label} row={row} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StarReportView({
  report,
  filterAction,
  hiddenFields,
  bridgeId,
}: {
  report: StarReport;
  filterAction: string;
  hiddenFields: Record<string, string>;
  bridgeId?: string;
}) {
  const resetParams = new URLSearchParams({ ...hiddenFields, tab: hiddenFields.tab ?? "stars" });
  return (
    <div className="star-report">
      <div className="card star-filter-card">
        <div className="card-body">
          <form method="GET" action={filterAction}>
            {Object.entries(hiddenFields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <div className="star-filter-row">
              <div className="form-group" style={{ margin: 0, minWidth: 280 }}>
                <label className="form-label">Speaker</label>
                <select
                  name="speaker"
                  className="form-control"
                  defaultValue={report.selectedSpeakers[0] ?? ""}
                >
                  <option value="">— All speakers —</option>
                  {report.speakers.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name} ({s.eventCount})
                    </option>
                  ))}
                </select>
              </div>
              <div className="star-filter-actions">
                <button type="submit" className="btn btn-primary btn-sm">
                  Apply Filter
                </button>
                <a
                  href={`${filterAction}?${resetParams.toString()}`}
                  className="btn btn-secondary btn-sm"
                >
                  Reset
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>

      {report.events.length === 0 ? (
        <p className="text-muted" style={{ padding: "2rem 0" }}>
          No webinars/seminars match the selected speaker filter.
        </p>
      ) : (
        <div className="star-event-list">
          {report.events.map((event) => (
            <StarEventSection key={event.eventId} event={event} bridgeId={bridgeId} />
          ))}
        </div>
      )}
    </div>
  );
}
