import { readDB, getUniversalSurvey } from "./db";
import {
  Event,
  Participant,
  AssessmentResponse,
  SurveyResponse,
  QuizAttempt,
  Quiz,
} from "./types";
import { computeEventStatus } from "./utils";
import { getPostTestForEvent, getPreTestForEvent } from "./bridge-settings";

export interface EventCompletionRow {
  id: string;
  title: string;
  category: string;
  speaker: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: string;
  regs: number;
  preDone: number;
  prePct: number;
  postDone: number;
  postPct: number;
  quizDone: number;
  quizPct: number;
  hasQuizQuestions: boolean;
  surveyActive: boolean;
  quizActive: boolean;
  preConfigured: boolean;
}

export interface NeedsAttentionItem {
  id: string;
  title: string;
  regs: number;
  reason: "survey_on_no_questions" | "regs_survey_off" | "quiz_on_no_questions";
}

function pct(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 1000) / 10;
}

function formatStat(done: number, total: number) {
  return `${done}/${total} (${pct(done, total)}%)`;
}

export { pct, formatStat };

export function buildEventCompletionRows(events: Event[]): EventCompletionRow[] {
  const participants = readDB<Participant>("participants");
  const preResponses = readDB<AssessmentResponse>("assessment_responses");
  const surveyResponses = readDB<SurveyResponse>("survey_responses");
  const quizAttempts = readDB<QuizAttempt>("quiz_attempts");
  const quizzes = readDB<Quiz>("quizzes");

  return events.map((event) => {
    const ev = { ...event, status: computeEventStatus(event) };
    const preConfigured = !!getPreTestForEvent(ev.id);
    const postTest = getPostTestForEvent(ev.id);
    const surveyActive = !!postTest?.is_active && (postTest.questions ?? []).some((question) => question.question.trim());
    const regs = participants.filter(
      (p) => p.event_id === ev.id && p.status !== "cancelled"
    ).length;

    const preDone = preResponses.filter((r) => r.event_id === ev.id).length;
    const postDone = surveyResponses.filter((r) => r.event_id === ev.id).length;
    const quizDone = quizAttempts.filter((a) => a.event_id === ev.id).length;

    const quiz = quizzes.find((q) => q.event_id === ev.id);
    const hasQuizQuestions =
      (quiz?.questions ?? []).filter((q) => q.question.trim()).length > 0;

    return {
      id: ev.id,
      title: ev.title,
      category: ev.category || "General",
      speaker: ev.speaker || "—",
      event_date: ev.event_date,
      start_time: ev.start_time,
      end_time: ev.end_time,
      status: ev.status,
      regs,
      preDone,
      prePct: pct(preDone, regs),
      postDone,
      postPct: pct(postDone, regs),
      quizDone,
      quizPct: pct(quizDone, regs),
      hasQuizQuestions,
      surveyActive,
      quizActive: quiz?.is_active ?? false,
      preConfigured,
    };
  });
}

export function buildNeedsAttention(rows: EventCompletionRow[]): {
  surveyOnNoQuestions: NeedsAttentionItem[];
  regsSurveyOff: NeedsAttentionItem[];
  quizOnNoQuestions: NeedsAttentionItem[];
} {
  const universalSurvey = getUniversalSurvey();
  const surveyQuestions =
    (universalSurvey?.questions ?? []).filter((q) => q.question.trim()).length;

  const surveyOnNoQuestions: NeedsAttentionItem[] = [];
  if (universalSurvey?.is_active && surveyQuestions === 0) {
    surveyOnNoQuestions.push({
      id: "global-survey",
      title: "Global Survey — no questions configured",
      regs: rows.reduce((s, r) => s + r.regs, 0),
      reason: "survey_on_no_questions",
    });
  }

  const regsSurveyOff = rows
    .filter((r) => r.regs > 0 && !r.surveyActive)
    .map((r) => ({
      id: r.id,
      title: r.title,
      regs: r.regs,
      reason: "regs_survey_off" as const,
    }))
    .sort((a, b) => b.regs - a.regs);

  const quizOnNoQuestions = rows
    .filter((r) => r.quizActive && !r.hasQuizQuestions)
    .map((r) => ({
      id: r.id,
      title: r.title,
      regs: r.regs,
      reason: "quiz_on_no_questions" as const,
    }))
    .sort((a, b) => b.regs - a.regs);

  return { surveyOnNoQuestions, regsSurveyOff, quizOnNoQuestions };
}

export function sortByDateDesc(rows: EventCompletionRow[]) {
  return [...rows].sort((a, b) => {
    const da = `${a.event_date}T${a.start_time}`;
    const db = `${b.event_date}T${b.start_time}`;
    return db.localeCompare(da);
  });
}

export function topByRegistrations(rows: EventCompletionRow[], limit = 5) {
  return [...rows].sort((a, b) => b.regs - a.regs).slice(0, limit);
}
