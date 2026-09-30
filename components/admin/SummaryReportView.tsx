import {
  SurveySummaryReport,
  SummaryGroupRow,
  ChartPoint,
  SummaryRanking,
} from "@/lib/summary-report";
import { CVSU_LEARNING_LABELS } from "@/lib/cvsu-learning-questions";
import { PrePostDistributionSection } from "@/components/admin/PrePostDistributionSection";

function fmt(n: number | null, digits = 2): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function RankingCard({
  title,
  items,
}: {
  title: string;
  items: SummaryRanking[];
}) {
  return (
    <div className="summary-ranking-card">
      <h3 className="summary-section-title">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted" style={{ fontSize: ".875rem", margin: 0 }}>
          No data for the selected filter.
        </p>
      ) : (
        <ol className="summary-ranking-list">
          {items.map((item, i) => (
            <li key={`${title}-${item.label}-${i}`}>
              <span className="summary-ranking-label">{item.label}</span>
              <span className="summary-ranking-value">{fmt(item.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function GroupedBarChart({
  points,
  title,
}: {
  points: ChartPoint[];
  title: string;
}) {
  const maxDelta = Math.max(
    1,
    ...points.map((p) => Math.abs(p.deltaKnowledge ?? 0))
  );

  return (
    <div className="summary-chart-card">
      <h3 className="summary-section-title">{title}</h3>
      {points.length === 0 ? (
        <p className="text-muted" style={{ fontSize: ".875rem" }}>
          No data for the selected filter.
        </p>
      ) : (
        <>
          <div className="summary-chart-legend">
            <span>
              <span className="summary-legend-swatch sat" /> Overall Satisfaction
              (1–5)
            </span>
            <span>
              <span className="summary-legend-swatch delta" /> Δ Knowledge
            </span>
          </div>
          <div className="summary-chart">
            {points.map((p) => (
              <div key={p.label} className="summary-chart-group">
                <div className="summary-chart-bars">
                  <div
                    className="summary-chart-bar sat"
                    style={{
                      height: `${((p.satisfaction ?? 0) / 5) * 100}%`,
                    }}
                    title={`Satisfaction: ${fmt(p.satisfaction)}`}
                  />
                  <div
                    className="summary-chart-bar delta"
                    style={{
                      height: `${(Math.abs(p.deltaKnowledge ?? 0) / maxDelta) * 100}%`,
                    }}
                    title={`Δ Knowledge: ${fmt(p.deltaKnowledge)}`}
                  />
                </div>
                <div className="summary-chart-xlabel" title={p.label}>
                  {p.label}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GroupTable({
  title,
  rows,
  mode,
}: {
  title: string;
  rows: SummaryGroupRow[];
  mode: "webinar" | "topic";
}) {
  return (
    <div className="card" style={{ marginTop: "1.25rem" }}>
      <div className="card-header" style={{ padding: "1rem 1.25rem" }}>
        <h2 className="summary-section-title" style={{ margin: 0 }}>
          {title}
        </h2>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="admin-table-wrap">
          <table className="admin-table report-wide-table">
            <thead>
              <tr>
                {mode === "webinar" && <th>Module</th>}
                <th>{mode === "topic" ? "Module" : "Webinar/Seminar"}</th>
                <th className="num">Resp. (P1)</th>
                <th className="num">Overall Sat</th>
                <th className="num">Quality</th>
                <th className="num">Speaker Know.</th>
                <th className="num">Info Value</th>
                <th className="num">Resp. (Pre-Post)</th>
                <th className="num">Δ Knowledge</th>
                <th className="num">Δ Interest</th>
                <th className="num">Δ Confidence</th>
                <th className="num">Δ Skills</th>
                <th className="num">Δ Willingness</th>
                <th className="num">Quiz 0–49</th>
                <th className="num">Quiz 50–69</th>
                <th className="num">Quiz 70–84</th>
                <th className="num">Quiz 85–100</th>
                <th className="num">Quiz Attempts</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={mode === "webinar" ? 18 : 17}
                    className="text-center text-muted"
                    style={{ padding: "2rem" }}
                  >
                    No data for the selected filter.
                  </td>
                </tr>
              ) : (
                rows.map((g) => (
                  <tr key={g.key}>
                    {mode === "topic" ? (
                      <td style={{ fontWeight: 600 }}>{g.label}</td>
                    ) : (
                      <>
                        <td>{g.topic}</td>
                        <td style={{ fontWeight: 600 }}>{g.label}</td>
                      </>
                    )}
                    <td className="num">{g.respP1}</td>
                    <td className="num">{fmt(g.overallSat)}</td>
                    <td className="num">{fmt(g.quality)}</td>
                    <td className="num">{fmt(g.speakerKnow)}</td>
                    <td className="num">{fmt(g.infoValue)}</td>
                    <td className="num">{g.respPrePost}</td>
                    <td className="num">{fmt(g.deltaKnowledge)}</td>
                    <td className="num">{fmt(g.deltaInterest)}</td>
                    <td className="num">{fmt(g.deltaConfidence)}</td>
                    <td className="num">{fmt(g.deltaSkills)}</td>
                    <td className="num">{fmt(g.deltaWillingness)}</td>
                    <td className="num">{g.quiz0_49}</td>
                    <td className="num">{g.quiz50_69}</td>
                    <td className="num">{g.quiz70_84}</td>
                    <td className="num">{g.quiz85_100}</td>
                    <td className="num">{g.quizAttempts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SummaryReportView({ report }: { report: SurveySummaryReport }) {
  const { kpis } = report;

  return (
    <div className="summary-report">
      <div className="admin-kpi-row summary-kpi-row">
        <div className="admin-kpi summary-kpi">
          <div className="admin-kpi-value">{fmt(kpis.overallSatisfaction)}</div>
          <div className="admin-kpi-label">Overall Satisfaction (P1)</div>
          <div className="summary-kpi-sub">{kpis.p1Respondents} respondents</div>
        </div>
        <div className="admin-kpi summary-kpi">
          <div className="admin-kpi-value">{fmt(kpis.quality)}</div>
          <div className="admin-kpi-label">Quality (P1)</div>
        </div>
        <div className="admin-kpi summary-kpi">
          <div className="admin-kpi-value">{fmt(kpis.speakerKnowledge)}</div>
          <div className="admin-kpi-label">Speaker Knowledge (P1)</div>
        </div>
        <div className="admin-kpi summary-kpi">
          <div className="admin-kpi-value">{fmt(kpis.deltaKnowledge)}</div>
          <div className="admin-kpi-label">Δ Knowledge (Pre→Post)</div>
          <div className="summary-kpi-sub">
            {kpis.pairedRespondents} paired respondents
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem" }}>
          <h2 className="summary-section-title" style={{ margin: 0 }}>
            Overall Quiz Distribution
          </h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="num">0–49</th>
                  <th className="num">50–69</th>
                  <th className="num">70–84</th>
                  <th className="num">85–100</th>
                  <th className="num">Total Attempts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="num">{report.quizDistribution.quiz0_49}</td>
                  <td className="num">{report.quizDistribution.quiz50_69}</td>
                  <td className="num">{report.quizDistribution.quiz70_84}</td>
                  <td className="num">{report.quizDistribution.quiz85_100}</td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {report.quizDistribution.totalAttempts}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="summary-interpretation">
        <h3 className="summary-section-title">Interpretation</h3>
        <ul>
          <li>
            <strong>Overall Satisfaction, Quality, Speaker Knowledge</strong> —
            mean Likert ratings (1–5) from Post Evaluation 1 (P1) among
            participants who submitted the post-survey.
          </li>
          <li>
            <strong>Δ Knowledge (Pre→Post)</strong> — mean change in the
            knowledge item (Pre Q1 vs Post P2) for participants with both
            pre-assessment and post-survey P2 responses.
          </li>
          <li>
            <strong>Δ columns</strong> — Post minus Pre per learning dimension
            (Knowledge, Interest, Confidence, Skills, Willingness).
          </li>
          <li>
            <strong>Quiz bands</strong> — count of submitted quiz attempts by
            score percentage range.
          </li>
        </ul>
      </div>

      <div className="summary-rankings-grid">
        <RankingCard
          title="Top 3 Modules — Overall Satisfaction"
          items={report.topTopicsBySat}
        />
        <RankingCard
          title="Top 3 Modules — Δ Knowledge"
          items={report.topTopicsByDelta}
        />
        <RankingCard
          title="Top 3 Events (Webinar/Seminar) — Overall Satisfaction"
          items={report.topWebinarsBySat}
        />
        <RankingCard
          title="Top 3 Events (Webinar/Seminar) — Δ Knowledge"
          items={report.topWebinarsByDelta}
        />
      </div>

      <div className="card" style={{ marginTop: "1.25rem" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem" }}>
          <h2 className="summary-section-title" style={{ margin: 0 }}>
            Pre vs Post Learning (Likert Q1–Q5)
          </h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Dimension</th>
                  <th className="num">Pre (Mean)</th>
                  <th className="num">Post (Mean)</th>
                  <th className="num">Δ (Post–Pre)</th>
                  <th className="num">Respondents (paired)</th>
                </tr>
              </thead>
              <tbody>
                {report.prePostLearning.map((row, i) => (
                  <tr key={row.label}>
                    <td style={{ maxWidth: 360, fontSize: ".8125rem" }}>
                      {row.question}
                    </td>
                    <td>{CVSU_LEARNING_LABELS[i]}</td>
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

      <div className="summary-charts-grid">
        <GroupedBarChart
          title="Satisfaction & Δ Knowledge by Webinar/Seminar"
          points={report.chartByWebinar}
        />
        <GroupedBarChart
          title="Satisfaction & Δ Knowledge by Module"
          points={report.chartByTopic}
        />
      </div>

      <PrePostDistributionSection events={report.prePostByEvent} />

      <GroupTable
        title="By Webinar/Seminar"
        rows={report.byWebinar}
        mode="webinar"
      />
      <GroupTable title="By Module" rows={report.byTopic} mode="topic" />
    </div>
  );
}
