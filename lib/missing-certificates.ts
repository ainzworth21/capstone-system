import { readDB, getUniversalPreAssessment, getUniversalSurvey } from "./db";
import {
  Event,
  Bridge,
  AssessmentResponse,
  Participant,
  SurveyResponse,
  QuizAttempt,
  Quiz,
  IssuedCertificate,
} from "./types";
import { isEventHost } from "./authz";
import { getMainEvents } from "./bridge";

export interface MissingCertRow {
  id: string;
  topic: string;
  webinar: string;
  eventId: string;
  name: string;
  email: string;
  studentId: string;
  program: string;
  reason: string;
}

export function buildMissingCertificateRows(organizerId?: string): {
  rows: MissingCertRow[];
  topics: string[];
  events: Event[];
} {
  let events = getMainEvents(readDB<Event>("events"), readDB<Bridge>("bridges"));
  if (organizerId) {
    events = events.filter((e) => isEventHost(e, organizerId));
  }

  const participants = readDB<Participant>("participants");
  const preResponses = readDB<AssessmentResponse>("assessment_responses");
  const issued = readDB<IssuedCertificate>("issued_certificates");
  const surveyResponses = readDB<SurveyResponse>("survey_responses");
  const quizAttempts = readDB<QuizAttempt>("quiz_attempts");
  const quizzes = readDB<Quiz>("quizzes");
  const preTestRequired = !!getUniversalPreAssessment();
  const universalSurvey = getUniversalSurvey();
  const surveyRequired =
    !!universalSurvey?.is_active &&
    (universalSurvey.questions ?? []).some((q) => q.question.trim() !== "");

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const issuedSet = new Set(
    issued.map((c) => `${c.event_id}:${c.participant_id}`)
  );

  const rows: MissingCertRow[] = [];

  for (const p of participants) {
    if (p.status !== "attended") continue;
    const ev = eventMap.get(p.event_id);
    if (!ev) continue;
    if (issuedSet.has(`${ev.id}:${p.id}`)) continue;

    const quiz = quizzes.find((q) => q.event_id === ev.id);
    const quizRequired = !!quiz?.is_active;
    const didSurvey = surveyResponses.some(
      (r) => r.event_id === ev.id && r.participant_id === p.id
    );
    const attempt = quizAttempts.find(
      (a) => a.event_id === ev.id && a.participant_id === p.id
    );

    const reasons: string[] = [];
    const didPreTest = preResponses.some(
      (response) => response.event_id === ev.id && response.participant_id === p.id
    );
    if (!preTestRequired) reasons.push("Pre-test not configured");
    else if (!didPreTest) reasons.push("Pre-test incomplete");
    if (!surveyRequired) reasons.push("Post-test not configured or inactive");
    else if (!didSurvey) reasons.push("Post-test incomplete");
    if (!quizRequired) reasons.push("Quiz not configured or inactive");
    else if (!attempt?.passed) reasons.push("Quiz not passed");
    if (reasons.length === 0) reasons.push("Not yet issued");

    rows.push({
      id: p.id,
      topic: ev.category || "General",
      webinar: ev.title,
      eventId: ev.id,
      name: p.full_name,
      email: p.email,
      studentId: p.student_id,
      program: p.course,
      reason: reasons.join("; "),
    });
  }

  rows.sort((a, b) => b.webinar.localeCompare(a.webinar));

  const topics = [...new Set(events.map((e) => e.category || "General"))].sort();

  return { rows, topics, events };
}

export function missingCertCsv(rows: MissingCertRow[]): string {
  const headers = [
    "Topic",
    "Webinar/Seminar",
    "Name",
    "Email",
    "Staff ID",
    "Program",
    "Reason",
  ];
  const csvRows = rows.map((r) => [
    r.topic,
    r.webinar,
    r.name,
    r.email,
    r.studentId,
    r.program,
    r.reason,
  ]);
  return [headers, ...csvRows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}
