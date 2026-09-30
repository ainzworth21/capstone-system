import { readDB } from "./db";
import {
  Event,
  Participant,
  AssessmentResponse,
  SurveyResponse,
  QuizAttempt,
  IssuedCertificate,
} from "./types";
import { isEventHost } from "./authz";

export interface CertMonitorRow {
  id: string;
  topic: string;
  title: string;
  start: string;
  end: string;
  startRaw: string;
  certificates: number;
  quiz: number;
  preSurvey: number;
  postSurvey: number;
  emptyCerts: number;
}

/** Format event local datetime as YYYY-MM-DD HH:MM:SS */
export function formatEventDateTime(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time;
  return `${date} ${t}`;
}

export function buildCertMonitorRows(organizerId?: string): CertMonitorRow[] {
  let events = readDB<Event>("events");
  if (organizerId) {
    events = events.filter((e) => isEventHost(e, organizerId));
  }

  const participants = readDB<Participant>("participants");
  const preResponses = readDB<AssessmentResponse>("assessment_responses");
  const surveyResponses = readDB<SurveyResponse>("survey_responses");
  const quizAttempts = readDB<QuizAttempt>("quiz_attempts");
  const issued = readDB<IssuedCertificate>("issued_certificates");

  return events
    .slice()
    .sort((a, b) => {
      const cmp = a.category.localeCompare(b.category);
      if (cmp !== 0) return cmp;
      return a.event_date.localeCompare(b.event_date) || a.title.localeCompare(b.title);
    })
    .map((ev) => {
      const certs = issued.filter((c) => c.event_id === ev.id).length;
      const quiz = quizAttempts.filter((a) => a.event_id === ev.id).length;
      const preSurvey = preResponses.filter((r) => r.event_id === ev.id).length;
      const postSurvey = surveyResponses.filter((r) => r.event_id === ev.id).length;

      const attended = participants.filter(
        (p) => p.event_id === ev.id && p.status === "attended"
      );
      const issuedIds = new Set(
        issued.filter((c) => c.event_id === ev.id).map((c) => c.participant_id)
      );
      const emptyCerts = attended.filter((p) => !issuedIds.has(p.id)).length;

      return {
        id: ev.id,
        topic: ev.category || "General",
        title: ev.title,
        start: formatEventDateTime(ev.event_date, ev.start_time),
        end: formatEventDateTime(ev.event_date, ev.end_time),
        startRaw: `${ev.event_date}T${ev.start_time}`,
        certificates: certs,
        quiz,
        preSurvey,
        postSurvey,
        emptyCerts,
      };
    });
}
