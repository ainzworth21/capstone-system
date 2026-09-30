import {
  readDB,
  getUniversalPreAssessment,
  getUniversalSurvey,
} from "./db";
import {
  Event,
  Bridge,
  Participant,
  AssessmentResponse,
  SurveyResponse,
  QuizAttempt,
  Quiz,
  IssuedCertificate,
} from "./types";
import {
  formatCompletedAt,
  normalizeParticipantDemographics,
  composeFullName,
} from "./registration-fields";
import {
  PRE_QUESTION_IDS,
  P2_QUESTION_IDS,
} from "./cvsu-learning-questions";
import { isEventHost } from "./authz";
import { getEventsForBridge, getMainEvents } from "./bridge";
import { getBridgeSettings } from "./bridge-settings";

/** Post-survey part 1 column labels (UiTM-style) */
export const P1_LABELS = [
  "P1 Objectives",
  "P1 Topic Appropriateness",
  "P1 Teaching Method",
  "P1 Info Value",
  "P1 Time Relevance",
  "P1 Topic Usefulness",
  "P1 Met Expectations",
  "P1 Clarity",
  "P1 Accommodating",
  "P1 Mastery",
  "P1 Relevance",
  "P1 Quality",
  "P1 Timeliness",
  "P1 Satisfaction",
] as const;

export const P1_TEXT_LABELS = ["P1 Comments", "P1 Recomm"] as const;

/** Post-survey part 2 column labels */
export const P2_LABELS = [
  "P2 Knowledge",
  "P2 Interest",
  "P2 Confidence",
  "P2 Skills",
  "P2 Willingness",
] as const;

export interface ReportFilters {
  topic?: string;
  event_id?: string;
  bridge_id?: string;
  organizer_id?: string;
  start_date?: string;
  end_date?: string;
  /** default: only participants with a certificate record */
  require_cert?: boolean;
}

export interface SurveyResultRow {
  topic: string;
  webinar: string;
  eventId: string;
  participant: string;
  email: string;
  institution: string;
  organization: string;
  registeredAt: string;
  hasCert: string;
  preAnswers: string[];
  preSubmittedAt: string;
  p1Answers: string[];
  p1Comments: string;
  p1Recomm: string;
  p1SubmittedAt: string;
  p2Answers: string[];
  p2SubmittedAt: string;
  quizStatus: string;
  quizScore: string;
  quizMax: string;
  quizPct: string;
  quizSubmittedAt: string;
  certFilePath: string;
  certEmailedAt: string;
  certCreatedAt: string;
}

export interface ReportMeta {
  preQuestionCount: number;
  preHeaders: string[];
  p1Headers: string[];
  p2Headers: string[];
  events: Event[];
  topics: string[];
}

function answerFor(
  answers: Record<string, string> | undefined,
  questionId: string | undefined
): string {
  if (!answers || !questionId) return "";
  return answers[questionId] ?? "";
}

function latestQuizAttempt(
  attempts: QuizAttempt[],
  eventId: string,
  participantId: string
): QuizAttempt | null {
  const list = attempts
    .filter((a) => a.event_id === eventId && a.participant_id === participantId)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  return list[0] ?? null;
}

export function buildSurveyResultReport(filters: ReportFilters = {}): {
  rows: SurveyResultRow[];
  meta: ReportMeta;
} {
  const allEvents = readDB<Event>("events");
  const bridges = readDB<Bridge>("bridges");
  const requestedBridge = filters.bridge_id
    ? bridges.find((bridge) => bridge.id === filters.bridge_id)
    : null;
  let events = filters.bridge_id
    ? requestedBridge
      ? getEventsForBridge(allEvents, requestedBridge, bridges)
      : []
    : getMainEvents(allEvents, bridges);
  if (filters.organizer_id) {
    const hostId = filters.organizer_id;
    events = events.filter((e) => isEventHost(e, hostId));
  }

  const scopedEvents = [...events];
  const topics = [...new Set(events.map((e) => e.category || "General"))].sort();

  if (filters.topic) {
    events = events.filter((e) => (e.category || "General") === filters.topic);
  }
  if (filters.event_id) {
    events = events.filter((e) => e.id === filters.event_id);
  }
  if (filters.start_date) {
    events = events.filter((e) => e.event_date >= filters.start_date!);
  }
  if (filters.end_date) {
    events = events.filter((e) => e.event_date <= filters.end_date!);
  }

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const participants = readDB<Participant>("participants").filter(
    (p) => eventMap.has(p.event_id) && p.status !== "cancelled"
  );

  const bridgeSettings = filters.bridge_id ? getBridgeSettings(filters.bridge_id) : null;
  const preAssessment = filters.bridge_id ? bridgeSettings?.pre_test ?? null : getUniversalPreAssessment();
  const survey = filters.bridge_id ? bridgeSettings?.post_test ?? null : getUniversalSurvey();
  const preQs = filters.bridge_id
    ? (preAssessment?.questions ?? []).filter((question) => question.question.trim())
    : PRE_QUESTION_IDS.map(
        (id) => preAssessment?.questions.find((question) => question.id === id)
      ).filter((question): question is NonNullable<typeof question> => !!question && question.question.trim() !== "");
  const surveyQs = (survey?.questions ?? []).filter((q) => q.question.trim());

  const bridgeP1Qs = surveyQs.filter((question) => question.id.startsWith("p1-") && question.type === "rating");
  const bridgeP2Qs = surveyQs.filter((question) => question.id.startsWith("p2-"));
  const bridgeHasPhases = bridgeP1Qs.length > 0 || bridgeP2Qs.length > 0;
  const p1Qs = filters.bridge_id
    ? bridgeHasPhases ? bridgeP1Qs : []
    : surveyQs.filter((question) => question.id.startsWith("p1-") && question.type === "rating").slice(0, P1_LABELS.length);
  const p2Qs = filters.bridge_id
    ? bridgeHasPhases ? bridgeP2Qs : surveyQs
    : P2_QUESTION_IDS.map((id) => surveyQs.find((question) => question.id === id)).filter((question): question is NonNullable<typeof question> => !!question);
  const preQuestionIds = filters.bridge_id ? preQs.map((question) => question.id) : PRE_QUESTION_IDS;

  const preResponses = readDB<AssessmentResponse>("assessment_responses");
  const surveyResponses = readDB<SurveyResponse>("survey_responses");
  const quizAttempts = readDB<QuizAttempt>("quiz_attempts");
  const quizzes = readDB<Quiz>("quizzes");
  const issued = readDB<IssuedCertificate>("issued_certificates");

  const requireCert = filters.require_cert !== false;

  const rows: SurveyResultRow[] = [];

  for (const p of participants) {
    const ev = eventMap.get(p.event_id)!;
    const cert = issued.find(
      (c) => c.event_id === ev.id && c.participant_id === p.id
    );
    if (requireCert && !cert) continue;

    const pre = preResponses.find(
      (r) => r.event_id === ev.id && r.participant_id === p.id
    );
    const post = surveyResponses.find(
      (r) => r.event_id === ev.id && r.participant_id === p.id
    );
    const quiz = quizzes.find((q) => q.event_id === ev.id);
    const attempt = latestQuizAttempt(quizAttempts, ev.id, p.id);
    const quizMax = (quiz?.questions ?? []).reduce(
      (s, q) => s + (q.points || 1),
      0
    );
    const quizPct = attempt ? Math.round(attempt.score) : "";
    const quizScore =
      attempt && quizMax > 0
        ? String(Math.round((attempt.score / 100) * quizMax))
        : attempt
          ? String(Math.round(attempt.score))
          : "";

    const preAnswers = preQuestionIds.map((id) =>
      answerFor(pre?.answers, id)
    );
    const p1Answers = p1Qs.map((question) =>
      answerFor(post?.answers, question.id)
    );
    const p2Answers = p2Qs.map((question) =>
      answerFor(post?.answers, question.id)
    );

    const demo = normalizeParticipantDemographics(p);

    rows.push({
      topic: ev.category || "General",
      webinar: ev.title,
      eventId: ev.id,
      participant: composeFullName(p) || p.full_name,
      email: p.email,
      institution: demo.institution,
      organization: demo.organization,
      registeredAt: formatCompletedAt(p.registered_at),
      hasCert: cert ? "Yes" : "No",
      preAnswers,
      preSubmittedAt: formatCompletedAt(pre?.submitted_at),
      p1Answers,
      p1Comments: answerFor(post?.answers, "p1-comments"),
      p1Recomm: answerFor(post?.answers, "p1-recommendations"),
      p1SubmittedAt: formatCompletedAt(post?.submitted_at),
      p2Answers,
      p2SubmittedAt: formatCompletedAt(post?.submitted_at),
      quizStatus: attempt ? "SUBMITTED" : "",
      quizScore: attempt ? String(quizScore) : "",
      quizMax: attempt && quizMax > 0 ? String(quizMax) : attempt ? "100" : "",
      quizPct: attempt ? String(quizPct) : "",
      quizSubmittedAt: formatCompletedAt(attempt?.submitted_at),
      certFilePath: cert ? `/verify/${cert.verification_code}` : "",
      certEmailedAt: "",
      certCreatedAt: formatCompletedAt(cert?.issued_at),
    });
  }

  rows.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));

  const preHeaders = preQs.map((_, i) => `Pre Q${i + 1}`);
  // pad to at least 5 for display consistency with reference
  while (preHeaders.length < 5 && preHeaders.length < Math.max(5, preQs.length)) {
    preHeaders.push(`Pre Q${preHeaders.length + 1}`);
  }
  if (preQs.length === 0) {
    for (let i = 1; i <= 5; i++) preHeaders.push(`Pre Q${i}`);
  }

  return {
    rows,
    meta: {
      preQuestionCount: Math.max(preQs.length, 5),
      preHeaders: preQs.length
        ? preQs.map((_, i) => `Pre Q${i + 1}`)
        : ["Pre Q1", "Pre Q2", "Pre Q3", "Pre Q4", "Pre Q5"],
      p1Headers: filters.bridge_id
        ? p1Qs.map((question, index) => `Post Q${index + 1}: ${question.question}`)
        : [...P1_LABELS],
      p2Headers: filters.bridge_id
        ? p2Qs.map((question, index) => `Post Q${p1Qs.length + index + 1}: ${question.question}`)
        : [...P2_LABELS],
      events: scopedEvents,
      topics,
    },
  };
}

export function surveyResultCsvHeaders(meta: ReportMeta): string[] {
  return [
    "Module",
    "Webinar/Seminar",
    "Participant",
    "Email",
    "Registered At",
    "Has Cert",
    ...meta.preHeaders,
    "Pre Submitted At",
    ...meta.p1Headers,
    ...P1_TEXT_LABELS,
    "P1 Submitted At",
    ...meta.p2Headers,
    "P2 Submitted At",
    "Quiz Status",
    "Quiz Score",
    "Quiz Max",
    "Quiz %",
    "Quiz Submitted At",
    "Cert File Path",
    "Cert Emailed At",
    "Cert Created At",
  ];
}

export function surveyResultToCsvRow(
  r: SurveyResultRow,
  meta: ReportMeta
): string[] {
  return surveyResultToCells(r, meta);
}

export function surveyResultToCells(
  r: SurveyResultRow,
  meta: ReportMeta
): string[] {
  const pre = [...r.preAnswers];
  while (pre.length < meta.preHeaders.length) pre.push("");
  const p1 = [...r.p1Answers];
  while (p1.length < meta.p1Headers.length) p1.push("");
  const p2 = [...r.p2Answers];
  while (p2.length < meta.p2Headers.length) p2.push("");

  return [
    r.topic,
    r.webinar,
    r.participant,
    r.email,
    r.registeredAt,
    r.hasCert,
    ...pre.slice(0, meta.preHeaders.length),
    r.preSubmittedAt,
    ...p1.slice(0, meta.p1Headers.length),
    r.p1Comments,
    r.p1Recomm,
    r.p1SubmittedAt,
    ...p2.slice(0, meta.p2Headers.length),
    r.p2SubmittedAt,
    r.quizStatus,
    r.quizScore,
    r.quizMax,
    r.quizPct,
    r.quizSubmittedAt,
    r.certFilePath,
    r.certEmailedAt,
    r.certCreatedAt,
  ];
}

export function buildSummaryStats(filters: ReportFilters) {
  const { rows } = buildSurveyResultReport({ ...filters, require_cert: false });
  const withCert = rows.filter((r) => r.hasCert === "Yes").length;
  const withQuiz = rows.filter((r) => r.quizStatus === "SUBMITTED").length;
  const withPre = rows.filter((r) => r.preSubmittedAt).length;
  const withPost = rows.filter((r) => r.p1SubmittedAt).length;
  return {
    participants: rows.length,
    withCert,
    withQuiz,
    withPre,
    withPost,
  };
}

export function buildInboundRows(filters: ReportFilters) {
  const { rows } = buildSurveyResultReport({ ...filters, require_cert: false });
  return rows.filter((r) => {
    const inst = r.institution.toLowerCase();
    const org = r.organization.toLowerCase();
    return (
      inst.includes("cvsu") ||
      org.includes("cvsu") ||
      org.includes("cavite state")
    );
  });
}

export function buildStarAverages(filters: ReportFilters) {
  const { rows, meta } = buildSurveyResultReport({
    ...filters,
    require_cert: false,
  });
  const stars: { label: string; avg: number; count: number }[] = [];

  function avgFor(getter: (r: SurveyResultRow) => string, label: string) {
    const nums = rows
      .map(getter)
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (nums.length === 0) {
      stars.push({ label, avg: 0, count: 0 });
      return;
    }
    const avg = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
    stars.push({ label, avg, count: nums.length });
  }

  meta.p1Headers.forEach((label, i) => {
    avgFor((r) => r.p1Answers[i] ?? "", label);
  });
  meta.p2Headers.forEach((label, i) => {
    avgFor((r) => r.p2Answers[i] ?? "", label);
  });

  return stars;
}
