import {
  buildSurveyResultReport,
  ReportFilters,
  SurveyResultRow,
} from "./reporting";
import { getUniversalPreAssessment, getUniversalSurvey } from "./db";
import { EventType } from "./types";
import { getBridgeSettings } from "./bridge-settings";
import {
  CVSU_LEARNING_QUESTION_TEXTS,
  PRE_QUESTION_IDS,
  P2_QUESTION_IDS,
} from "./cvsu-learning-questions";

/** P1 rating indices in p1Answers (0-based). */
const P1_IDX = {
  info: 3,
  mastery: 9,
  quality: 11,
  satisfaction: 13,
} as const;

export interface SummaryKpis {
  overallSatisfaction: number | null;
  quality: number | null;
  speakerKnowledge: number | null;
  deltaKnowledge: number | null;
  p1Respondents: number;
  pairedRespondents: number;
}

export interface PrePostLearningRow {
  label: string;
  question: string;
  preMean: number | null;
  postMean: number | null;
  delta: number | null;
  pairedCount: number;
}

export interface SummaryGroupRow {
  key: string;
  label: string;
  topic: string;
  respP1: number;
  overallSat: number | null;
  quality: number | null;
  speakerKnow: number | null;
  infoValue: number | null;
  respPrePost: number;
  deltaKnowledge: number | null;
  deltaInterest: number | null;
  deltaConfidence: number | null;
  deltaSkills: number | null;
  deltaWillingness: number | null;
  quiz0_49: number;
  quiz50_69: number;
  quiz70_84: number;
  quiz85_100: number;
  quizAttempts: number;
}

export interface SummaryRanking {
  label: string;
  value: number;
}

export interface ChartPoint {
  label: string;
  satisfaction: number | null;
  deltaKnowledge: number | null;
}

export interface QuizDistribution {
  quiz0_49: number;
  quiz50_69: number;
  quiz70_84: number;
  quiz85_100: number;
  totalAttempts: number;
}

export interface LikertDistribution {
  pre: number[];
  post: number[];
}

export interface QuestionDistribution {
  label: string;
  question: string;
  distribution: LikertDistribution;
}

export interface EventPrePostDistribution {
  eventId: string;
  label: string;
  topic: string;
  eventType: EventType;
  eventDate: string;
  pairedCount: number;
  questions: QuestionDistribution[];
}

export interface SurveySummaryReport {
  kpis: SummaryKpis;
  quizDistribution: QuizDistribution;
  prePostLearning: PrePostLearningRow[];
  prePostByEvent: EventPrePostDistribution[];
  topTopicsBySat: SummaryRanking[];
  topTopicsByDelta: SummaryRanking[];
  topWebinarsBySat: SummaryRanking[];
  topWebinarsByDelta: SummaryRanking[];
  byWebinar: SummaryGroupRow[];
  byTopic: SummaryGroupRow[];
  chartByWebinar: ChartPoint[];
  chartByTopic: ChartPoint[];
}

function parseRating(v: string | undefined): number | null {
  if (!v?.trim()) return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < 1 || n > 5) return null;
  return n;
}

/** Question text from global pre-assessment / survey P2, with canonical fallback. */
export function getLearningQuestionTexts(): string[] {
  const preAssessment = getUniversalPreAssessment();
  const survey = getUniversalSurvey();
  const surveyQs = (survey?.questions ?? []).filter((q) => q.question.trim());

  return PRE_QUESTION_IDS.map((id, i) => {
    const preQ = preAssessment?.questions.find((q) => q.id === id);
    const p2Q = surveyQs.find((q) => q.id === P2_QUESTION_IDS[i]);
    const preText = preQ?.question?.trim();
    const p2Text = p2Q?.question?.trim();
    return preText || p2Text || CVSU_LEARNING_QUESTION_TEXTS[i];
  });
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function avgP1(rows: SurveyResultRow[], index: number): number | null {
  const vals = rows
    .map((r) => parseRating(r.p1Answers[index]))
    .filter((n): n is number => n !== null);
  return mean(vals);
}

function pairedDeltas(
  rows: SurveyResultRow[],
  index: number
): { avg: number | null; count: number } {
  const deltas: number[] = [];
  for (const r of rows) {
    const pre = parseRating(r.preAnswers[index]);
    const post = parseRating(r.p2Answers[index]);
    if (pre !== null && post !== null) deltas.push(post - pre);
  }
  return { avg: mean(deltas), count: deltas.length };
}

function aggregateGroup(
  rows: SurveyResultRow[],
  key: string,
  label: string,
  topic: string
): SummaryGroupRow {
  const p1Rows = rows.filter((r) => r.p1SubmittedAt);
  const d0 = pairedDeltas(rows, 0);
  const d1 = pairedDeltas(rows, 1);
  const d2 = pairedDeltas(rows, 2);
  const d3 = pairedDeltas(rows, 3);
  const d4 = pairedDeltas(rows, 4);

  const quizPcts = rows
    .filter((r) => r.quizStatus === "SUBMITTED" && r.quizPct !== "")
    .map((r) => Number(r.quizPct))
    .filter((n) => !Number.isNaN(n));

  return {
    key,
    label,
    topic,
    respP1: p1Rows.length,
    overallSat: avgP1(p1Rows, P1_IDX.satisfaction),
    quality: avgP1(p1Rows, P1_IDX.quality),
    speakerKnow: avgP1(p1Rows, P1_IDX.mastery),
    infoValue: avgP1(p1Rows, P1_IDX.info),
    respPrePost: d0.count,
    deltaKnowledge: d0.avg,
    deltaInterest: d1.avg,
    deltaConfidence: d2.avg,
    deltaSkills: d3.avg,
    deltaWillingness: d4.avg,
    quiz0_49: quizPcts.filter((p) => p < 50).length,
    quiz50_69: quizPcts.filter((p) => p >= 50 && p < 70).length,
    quiz70_84: quizPcts.filter((p) => p >= 70 && p < 85).length,
    quiz85_100: quizPcts.filter((p) => p >= 85).length,
    quizAttempts: quizPcts.length,
  };
}

function topRankings(
  groups: SummaryGroupRow[],
  pick: (g: SummaryGroupRow) => number | null,
  labelKey: "label" | "topic" = "label"
): SummaryRanking[] {
  return groups
    .map((g) => ({ label: g[labelKey], value: pick(g) }))
    .filter((x): x is SummaryRanking => x.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

function countPairedLikert(
  rows: SurveyResultRow[],
  questionIndex: number
): LikertDistribution {
  const pre = [0, 0, 0, 0, 0];
  const post = [0, 0, 0, 0, 0];
  for (const r of rows) {
    const preVal = parseRating(r.preAnswers[questionIndex]);
    const postVal = parseRating(r.p2Answers[questionIndex]);
    if (preVal !== null && postVal !== null) {
      pre[preVal - 1]++;
      post[postVal - 1]++;
    }
  }
  return { pre, post };
}

function buildPrePostByEvent(
  webinarMap: Map<string, SurveyResultRow[]>,
  eventTypeMap: Map<string, EventType>,
  eventDateMap: Map<string, string>,
  questionTexts: string[]
): EventPrePostDistribution[] {
  return [...webinarMap.entries()]
    .map(([eventId, groupRows]) => {
      const questions: QuestionDistribution[] = questionTexts.map(
        (question, i) => ({
          label: `Q${i + 1}`,
          question,
          distribution: countPairedLikert(groupRows, i),
        })
      );
      const pairedCount = countPairedLikert(groupRows, 0).pre.reduce(
        (a, b) => a + b,
        0
      );
      return {
        eventId,
        label: groupRows[0]?.webinar ?? eventId,
        topic: groupRows[0]?.topic ?? "General",
        eventType: eventTypeMap.get(eventId) ?? "seminar",
        eventDate: eventDateMap.get(eventId) ?? "",
        pairedCount,
        questions,
      };
    })
    .filter((e) => e.pairedCount > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildSurveySummaryReport(
  filters: ReportFilters = {}
): SurveySummaryReport {
  const { rows, meta } = buildSurveyResultReport({ ...filters, require_cert: false });
  const eventTypeMap = new Map(
    meta.events.map((e) => [e.id, e.event_type])
  );
  const eventDateMap = new Map(
    meta.events.map((e) => [e.id, e.event_date])
  );
  const questionTexts = filters.bridge_id
    ? (getBridgeSettings(filters.bridge_id)?.pre_test?.questions ?? []).map((question) => question.question.trim()).filter(Boolean)
    : getLearningQuestionTexts();
  const postRows = rows.filter((r) => r.p1SubmittedAt);
  const knowledgePair = pairedDeltas(rows, 0);

  const kpis: SummaryKpis = {
    overallSatisfaction: avgP1(postRows, P1_IDX.satisfaction),
    quality: avgP1(postRows, P1_IDX.quality),
    speakerKnowledge: avgP1(postRows, P1_IDX.mastery),
    deltaKnowledge: knowledgePair.avg,
    p1Respondents: postRows.length,
    pairedRespondents: knowledgePair.count,
  };

  const allQuizPcts = rows
    .filter((r) => r.quizStatus === "SUBMITTED" && r.quizPct !== "")
    .map((r) => Number(r.quizPct))
    .filter((n) => !Number.isNaN(n));

  const quizDistribution: QuizDistribution = {
    quiz0_49: allQuizPcts.filter((p) => p < 50).length,
    quiz50_69: allQuizPcts.filter((p) => p >= 50 && p < 70).length,
    quiz70_84: allQuizPcts.filter((p) => p >= 70 && p < 85).length,
    quiz85_100: allQuizPcts.filter((p) => p >= 85).length,
    totalAttempts: allQuizPcts.length,
  };

  const prePostLearning: PrePostLearningRow[] = questionTexts.map(
    (question, i) => {
      const preVals = rows
        .map((r) => parseRating(r.preAnswers[i]))
        .filter((n): n is number => n !== null);
      const postVals = rows
        .map((r) => parseRating(r.p2Answers[i]))
        .filter((n): n is number => n !== null);
      const pair = pairedDeltas(rows, i);
      return {
        label: `Q${i + 1}`,
        question,
        preMean: mean(preVals),
        postMean: mean(postVals),
        delta: pair.avg,
        pairedCount: pair.count,
      };
    }
  );

  const webinarMap = new Map<string, SurveyResultRow[]>();
  for (const r of rows) {
    if (!webinarMap.has(r.eventId)) webinarMap.set(r.eventId, []);
    webinarMap.get(r.eventId)!.push(r);
  }

  const byWebinar: SummaryGroupRow[] = [...webinarMap.entries()]
    .map(([eventId, groupRows]) =>
      aggregateGroup(
        groupRows,
        eventId,
        groupRows[0]?.webinar ?? eventId,
        groupRows[0]?.topic ?? "General"
      )
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  const topicMap = new Map<string, SurveyResultRow[]>();
  for (const r of rows) {
    const t = r.topic || "General";
    if (!topicMap.has(t)) topicMap.set(t, []);
    topicMap.get(t)!.push(r);
  }

  const byTopic: SummaryGroupRow[] = [...topicMap.entries()]
    .map(([topic, groupRows]) =>
      aggregateGroup(groupRows, topic, topic, topic)
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  const chartByWebinar: ChartPoint[] = byWebinar.map((g) => ({
    label: g.label,
    satisfaction: g.overallSat,
    deltaKnowledge: g.deltaKnowledge,
  }));

  const chartByTopic: ChartPoint[] = byTopic.map((g) => ({
    label: g.label,
    satisfaction: g.overallSat,
    deltaKnowledge: g.deltaKnowledge,
  }));

  const prePostByEvent = buildPrePostByEvent(
    webinarMap,
    eventTypeMap,
    eventDateMap,
    questionTexts
  );

  return {
    kpis,
    quizDistribution,
    prePostLearning,
    prePostByEvent,
    topTopicsBySat: topRankings(byTopic, (g) => g.overallSat, "label"),
    topTopicsByDelta: topRankings(byTopic, (g) => g.deltaKnowledge, "label"),
    topWebinarsBySat: topRankings(byWebinar, (g) => g.overallSat, "label"),
    topWebinarsByDelta: topRankings(byWebinar, (g) => g.deltaKnowledge, "label"),
    byWebinar,
    byTopic,
    chartByWebinar,
    chartByTopic,
  };
}

export function summaryGroupCsvHeaders(): string[] {
  return [
    "Topic",
    "Webinar/Seminar",
    "Resp. (P1)",
    "Overall Sat",
    "Quality",
    "Speaker Know.",
    "Info Value",
    "Resp. (Pre-Post)",
    "Delta Knowledge",
    "Delta Interest",
    "Delta Confidence",
    "Delta Skills",
    "Delta Willingness",
    "Quiz 0-49",
    "Quiz 50-69",
    "Quiz 70-84",
    "Quiz 85-100",
    "Quiz Attempts",
  ];
}

export function summaryGroupToCsvRow(g: SummaryGroupRow, mode: "webinar" | "topic"): string[] {
  const fmt = (n: number | null) => (n === null ? "" : String(n));
  if (mode === "topic") {
    return [
      g.label,
      "",
      String(g.respP1),
      fmt(g.overallSat),
      fmt(g.quality),
      fmt(g.speakerKnow),
      fmt(g.infoValue),
      String(g.respPrePost),
      fmt(g.deltaKnowledge),
      fmt(g.deltaInterest),
      fmt(g.deltaConfidence),
      fmt(g.deltaSkills),
      fmt(g.deltaWillingness),
      String(g.quiz0_49),
      String(g.quiz50_69),
      String(g.quiz70_84),
      String(g.quiz85_100),
      String(g.quizAttempts),
    ];
  }
  return [
    g.topic,
    g.label,
    String(g.respP1),
    fmt(g.overallSat),
    fmt(g.quality),
    fmt(g.speakerKnow),
    fmt(g.infoValue),
    String(g.respPrePost),
    fmt(g.deltaKnowledge),
    fmt(g.deltaInterest),
    fmt(g.deltaConfidence),
    fmt(g.deltaSkills),
    fmt(g.deltaWillingness),
    String(g.quiz0_49),
    String(g.quiz50_69),
    String(g.quiz70_84),
    String(g.quiz85_100),
    String(g.quizAttempts),
  ];
}