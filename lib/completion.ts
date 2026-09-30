import {
  readDB,
} from "./db";
import {
  AssessmentResponse,
  Bridge,
  Event,
  Participant,
  SurveyResponse,
  QuizAttempt,
  Quiz,
  AttendanceLog,
} from "./types";
import { normalizeParticipantDemographics } from "./registration-fields";
import { isEventHost } from "./authz";
import { getEventsForBridge, getMainEvents } from "./bridge";
import { getPostTestForEvent, getPreTestForEvent } from "./bridge-settings";

export type CompletionStatusFilter =
  | "completed"
  | "registered"
  | "cancelled"
  | "waitlist"
  | "cert_ready"
  | "all";

export interface CompletionRow {
  id: string;
  topic: string;
  eventId: string;
  eventTitle: string;
  eventType: string;
  name: string;
  email: string;
  age: number | null;
  country: string;
  designation: string;
  organization: string;
  program: string;
  institution: string;
  staffId: string;
  completedAt: string | null;
  registeredAt: string;
  yearLevel: number;
  status: string;
  certReady: boolean;
}

export interface CompletionFilters {
  bridge_id?: string;
  status?: string;
  topic?: string;
  event_id?: string;
  designation?: string;
  organization?: string;
  country?: string;
  program?: string;
  institution?: string;
  year?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: string;
  organizer_id?: string;
}

function isCertReady(
  p: Participant,
  eventId: string,
  preTestRequired: boolean,
  surveyRequired: boolean,
  quizRequired: boolean,
  preResponses: AssessmentResponse[],
  surveyResponses: SurveyResponse[],
  quizAttempts: QuizAttempt[]
): boolean {
  if (p.status !== "attended" || !preTestRequired || !surveyRequired || !quizRequired) return false;
  const didPreTest = preResponses.some(
    (r) => r.event_id === eventId && r.participant_id === p.id
  );
  const didSurvey = surveyResponses.some(
    (r) => r.event_id === eventId && r.participant_id === p.id
  );
  const attempt = quizAttempts.find(
    (a) => a.event_id === eventId && a.participant_id === p.id
  );
  return didPreTest && didSurvey && !!attempt?.passed;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter((v) => v.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function buildCompletionRows(filters: CompletionFilters = {}): {
  rows: CompletionRow[];
  total: number;
  events: Event[];
  topics: string[];
  programs: string[];
  years: number[];
  designations: string[];
  organizations: string[];
  countries: string[];
  institutions: string[];
} {
  const allEvents = readDB<Event>("events");
  const bridges = readDB<Bridge>("bridges");
  const selectedBridge = filters.bridge_id
    ? bridges.find((bridge) => bridge.id === filters.bridge_id)
    : null;
  let events = filters.bridge_id
    ? selectedBridge
      ? getEventsForBridge(allEvents, selectedBridge, bridges)
      : []
    : getMainEvents(allEvents, bridges);
  if (filters.organizer_id) {
    const hostId = filters.organizer_id;
    events = events.filter((e) => isEventHost(e, hostId));
  }

  const participants = readDB<Participant>("participants");
  const preResponses = readDB<AssessmentResponse>("assessment_responses");
  const surveyResponses = readDB<SurveyResponse>("survey_responses");
  const quizAttempts = readDB<QuizAttempt>("quiz_attempts");
  const quizzes = readDB<Quiz>("quizzes");
  const attendance = readDB<AttendanceLog>("attendance_logs");

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const scopedParticipants = participants.filter((participant) => eventMap.has(participant.event_id));
  const attendanceByParticipant = new Map<string, string>();
  for (const a of attendance) {
    const prev = attendanceByParticipant.get(a.participant_id);
    if (!prev || a.scanned_at > prev) {
      attendanceByParticipant.set(a.participant_id, a.scanned_at);
    }
  }

  const statusFilter = (filters.status || "completed") as CompletionStatusFilter;

  let rows: CompletionRow[] = [];

  for (const p of scopedParticipants) {
    const ev = eventMap.get(p.event_id);
    if (!ev) continue;

    const demo = normalizeParticipantDemographics(p);
    const quiz = quizzes.find((q) => q.event_id === ev.id);
    const preTestRequired = !!getPreTestForEvent(ev.id);
    const postTest = getPostTestForEvent(ev.id);
    const surveyRequired = !!postTest?.is_active && (postTest.questions ?? []).some((q) => q.question.trim());
    const quizRequired = !!quiz?.is_active;
    const certReady = isCertReady(
      p,
      ev.id,
      preTestRequired,
      surveyRequired,
      quizRequired,
      preResponses,
      surveyResponses,
      quizAttempts
    );

    const completedAt =
      p.status === "attended"
        ? attendanceByParticipant.get(p.id) ?? p.registered_at
        : null;

    rows.push({
      id: p.id,
      topic: ev.category || "General",
      eventId: ev.id,
      eventTitle: ev.title,
      eventType: ev.event_type,
      name: p.full_name,
      email: p.email,
      age: demo.age,
      country: demo.country,
      designation: demo.designation,
      organization: demo.organization,
      program: p.course || "",
      institution: demo.institution,
      staffId: p.student_id || "",
      completedAt,
      registeredAt: p.registered_at,
      yearLevel: p.year_level,
      status: p.status,
      certReady,
    });
  }

  if (statusFilter === "completed") {
    rows = rows.filter((r) => r.status === "attended");
  } else if (statusFilter === "cert_ready") {
    rows = rows.filter((r) => r.certReady);
  } else if (statusFilter === "registered") {
    rows = rows.filter((r) => r.status === "registered");
  } else if (statusFilter === "cancelled") {
    rows = rows.filter((r) => r.status === "cancelled");
  } else if (statusFilter === "waitlist") {
    rows = rows.filter((r) => r.status === "waitlist");
  }

  if (filters.topic) rows = rows.filter((r) => r.topic === filters.topic);
  if (filters.event_id) rows = rows.filter((r) => r.eventId === filters.event_id);
  if (filters.designation) {
    rows = rows.filter((r) => r.designation === filters.designation);
  }
  if (filters.organization) {
    rows = rows.filter((r) => r.organization === filters.organization);
  }
  if (filters.country) {
    rows = rows.filter((r) => r.country === filters.country);
  }
  if (filters.program) rows = rows.filter((r) => r.program === filters.program);
  if (filters.institution) {
    rows = rows.filter((r) => r.institution === filters.institution);
  }
  if (filters.year) {
    const y = Number(filters.year);
    if (!Number.isNaN(y)) rows = rows.filter((r) => r.yearLevel === y);
  }

  if (filters.from || filters.to) {
    rows = rows.filter((r) => {
      const dateStr = (r.completedAt ?? r.registeredAt).slice(0, 10);
      if (filters.from && dateStr < filters.from) return false;
      if (filters.to && dateStr > filters.to) return false;
      return true;
    });
  }

  if (filters.q) {
    const q = filters.q.toLowerCase().trim();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q) ||
        r.eventTitle.toLowerCase().includes(q) ||
        r.program.toLowerCase().includes(q) ||
        r.staffId.toLowerCase().includes(q) ||
        r.organization.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.institution.toLowerCase().includes(q) ||
        (r.age != null && String(r.age).includes(q))
    );
  }

  rows.sort((a, b) => {
    const da = a.completedAt ?? a.registeredAt;
    const db = b.completedAt ?? b.registeredAt;
    return db.localeCompare(da);
  });

  const total = rows.length;
  const limit = Math.min(Math.max(Number(filters.limit) || 500, 1), 5000);
  rows = rows.slice(0, limit);

  const topics = [...new Set(events.map((e) => e.category || "General"))].sort();
  const programs = uniqueSorted(scopedParticipants.map((p) => p.course || ""));
  const years = [
    ...new Set(scopedParticipants.map((p) => p.year_level).filter((y) => y > 0)),
  ].sort((a, b) => a - b);
  const designations = uniqueSorted(
    scopedParticipants.map((p) => normalizeParticipantDemographics(p).designation)
  );
  const organizations = uniqueSorted(
    scopedParticipants.map((p) => normalizeParticipantDemographics(p).organization)
  );
  const countries = uniqueSorted(
    scopedParticipants.map((p) => normalizeParticipantDemographics(p).country)
  );
  const institutions = uniqueSorted(
    scopedParticipants.map((p) => normalizeParticipantDemographics(p).institution)
  );

  return {
    rows,
    total,
    events,
    topics,
    programs,
    years,
    designations,
    organizations,
    countries,
    institutions,
  };
}

/** Per-participant Pre / Survey / Post / Quiz flags for an event roster. */
export interface ParticipantCompletion {
  pre: boolean;
  survey: boolean;
  post: boolean;
  quiz: boolean;
}

export function emptyCompletion(): ParticipantCompletion {
  return { pre: false, survey: false, post: false, quiz: false };
}

/** Build Pre / Survey / Post / Quiz flags for every participant on an event. */
export function getEventCompletionMap(
  eventId: string
): Map<string, ParticipantCompletion> {
  const preResponses = readDB<AssessmentResponse>("assessment_responses").filter(
    (r) => r.event_id === eventId
  );
  const surveyResponses = readDB<SurveyResponse>("survey_responses").filter(
    (r) => r.event_id === eventId
  );
  const quizAttempts = readDB<QuizAttempt>("quiz_attempts").filter(
    (a) => a.event_id === eventId
  );

  const preIds = new Set(preResponses.map((r) => r.participant_id));
  const quizIds = new Set(quizAttempts.map((a) => a.participant_id));

  /** P1 = evaluation/survey section; P2 = learning outcomes (post paired with pre). */
  const surveyIds = new Set<string>();
  const postIds = new Set<string>();
  for (const r of surveyResponses) {
    const keys = Object.keys(r.answers ?? {});
    if (keys.some((k) => k.startsWith("p1-")) || keys.length > 0) {
      surveyIds.add(r.participant_id);
    }
    if (keys.some((k) => k.startsWith("p2-"))) {
      postIds.add(r.participant_id);
    } else if (keys.length > 0 && !keys.some((k) => k.startsWith("p1-"))) {
      postIds.add(r.participant_id);
    }
  }

  const participants = readDB<Participant>("participants").filter(
    (p) => p.event_id === eventId
  );
  const map = new Map<string, ParticipantCompletion>();
  for (const p of participants) {
    map.set(p.id, {
      pre: preIds.has(p.id),
      survey: surveyIds.has(p.id),
      post: postIds.has(p.id),
      quiz: quizIds.has(p.id),
    });
  }
  return map;
}
