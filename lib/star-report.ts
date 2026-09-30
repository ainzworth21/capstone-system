import { readDB } from "./db";
import { Bridge, Event, Quiz, QuizAttempt, User } from "./types";
import { buildSurveyResultReport, SurveyResultRow } from "./reporting";
import { getLearningQuestionTexts } from "./summary-report";
import { getBridgeSettings } from "./bridge-settings";
import { eventSpeakerIds, isAssignedSpeaker } from "@/lib/speaker-ids";
import { isEventHost } from "./authz";
import { getEventsForBridge, getMainEvents } from "./bridge";

function parseRating(v: string | undefined): number | null {
  if (!v?.trim()) return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < 1 || n > 5) return null;
  return n;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
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

function countPairedLikert(
  rows: SurveyResultRow[],
  questionIndex: number
): { pre: number[]; post: number[] } {
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

export interface StarReportFilters {
  bridge_id?: string;
  topic?: string;
  event_id?: string;
  organizer_id?: string;
  /** Stable keys: `id:<userId>` or `name:<trimmed display name>` */
  speakers?: string[];
}

export interface StarQuizOption {
  label: string;
  text: string;
  isCorrect: boolean;
  count: number;
}

export interface StarQuizQuestion {
  index: number;
  question: string;
  options: StarQuizOption[];
  correctIndex: number;
}

export interface StarQuizSummary {
  band0_49: number;
  band50_69: number;
  band70_84: number;
  band85_100: number;
  attempts: number;
  averagePct: number | null;
}

export interface StarPrePostRow {
  label: string;
  question: string;
  preMean: number | null;
  postMean: number | null;
  delta: number | null;
  pairedCount: number;
  preCounts: number[];
  postCounts: number[];
}

export interface StarEventReport {
  eventId: string;
  title: string;
  topic: string;
  speaker: string;
  eventType: string;
  displayDate: string;
  quizQuestions: StarQuizQuestion[];
  quizSummary: StarQuizSummary;
  prePostLearning: StarPrePostRow[];
  pairedRespondents: number;
  preRespondents: number;
  postRespondents: number;
}

export interface StarSpeakerOption {
  /** Filter value submitted by the dropdown */
  key: string;
  name: string;
  eventCount: number;
}

export interface StarReport {
  speakers: StarSpeakerOption[];
  selectedSpeakers: string[];
  events: StarEventReport[];
}

/** Stable filter keys for an event's resource speakers (one key per assigned speaker). */
export function eventSpeakerKeys(event: Event): string[] {
  const ids = eventSpeakerIds(event);
  if (ids.length > 0) return ids.map((id) => `id:${id}`);
  const name = (event.speaker || "").trim();
  return name ? [`name:${name}`] : [];
}

/** @deprecated Prefer eventSpeakerKeys for multi-speaker; returns first key. */
export function eventSpeakerKey(event: Event): string | null {
  return eventSpeakerKeys(event)[0] ?? null;
}

function speakerDisplayNameForId(
  speakerId: string,
  event: Event,
  usersById: Map<string, User>
): string {
  const user = usersById.get(speakerId);
  if (user?.full_name?.trim()) return user.full_name.trim();
  return (event.speaker || "").trim() || "—";
}

function speakerDisplayName(
  event: Event,
  usersById: Map<string, User>
): string {
  const ids = eventSpeakerIds(event);
  if (ids.length > 0) {
    const names = ids
      .map((id) => usersById.get(id)?.full_name?.trim())
      .filter(Boolean) as string[];
    if (names.length > 0) return names.join(" · ");
  }
  return (event.speaker || "").trim() || "—";
}

function formatEventDateTime(event: Event): string {
  const d = new Date(`${event.event_date}T${event.start_time || "00:00"}`);
  if (Number.isNaN(d.getTime())) return event.event_date;
  return d
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

function countLikertAnswers(
  rows: SurveyResultRow[],
  pick: (r: SurveyResultRow, i: number) => string,
  questionIndex: number
): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const r of rows) {
    const val = parseRating(pick(r, questionIndex));
    if (val !== null) counts[val - 1]++;
  }
  return counts;
}

function buildQuizSection(eventId: string): {
  questions: StarQuizQuestion[];
  summary: StarQuizSummary;
} {
  const quiz = readDB<Quiz>("quizzes").find((q) => q.event_id === eventId);
  const attempts = readDB<QuizAttempt>("quiz_attempts").filter(
    (a) => a.event_id === eventId
  );
  const questions = (quiz?.questions ?? []).filter((q) => q.question.trim());

  const quizQuestions: StarQuizQuestion[] = questions.map((q, i) => {
    const correctIdx = q.options.findIndex(
      (o) => o.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
    );
    const dist = new Array(q.options.length).fill(0);
    for (const att of attempts) {
      const ans = (att.answers[q.id] ?? "").trim().toLowerCase();
      const idx = q.options.findIndex((o) => o.trim().toLowerCase() === ans);
      if (idx >= 0) dist[idx]++;
    }
    return {
      index: i + 1,
      question: q.question,
      correctIndex: correctIdx,
      options: q.options.map((text, j) => ({
        label: String.fromCharCode(65 + j),
        text,
        isCorrect: j === correctIdx,
        count: dist[j] ?? 0,
      })),
    };
  });

  const scores = attempts.map((a) => a.score).filter((n) => !Number.isNaN(n));
  const summary: StarQuizSummary = {
    band0_49: scores.filter((p) => p < 50).length,
    band50_69: scores.filter((p) => p >= 50 && p < 70).length,
    band70_84: scores.filter((p) => p >= 70 && p < 85).length,
    band85_100: scores.filter((p) => p >= 85).length,
    attempts: scores.length,
    averagePct:
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
          100
        : null,
  };

  return { questions: quizQuestions, summary };
}

function buildPrePostSection(rows: SurveyResultRow[], questionTexts: string[]): {
  prePostLearning: StarPrePostRow[];
  pairedRespondents: number;
  preRespondents: number;
  postRespondents: number;
} {
  const prePostLearning: StarPrePostRow[] = questionTexts.map((question, i) => {
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
      preCounts: countLikertAnswers(rows, (r, idx) => r.preAnswers[idx] ?? "", i),
      postCounts: countLikertAnswers(rows, (r, idx) => r.p2Answers[idx] ?? "", i),
    };
  });
  const pairedRespondents = countPairedLikert(rows, 0).pre.reduce(
    (a, b) => a + b,
    0
  );
  const preRespondents = rows.filter((r) =>
    r.preAnswers.some((a) => parseRating(a) !== null)
  ).length;
  const postRespondents = rows.filter((r) =>
    r.p2Answers.some((a) => parseRating(a) !== null)
  ).length;
  return { prePostLearning, pairedRespondents, preRespondents, postRespondents };
}

function buildStarEventReport(
  event: Event,
  rows: SurveyResultRow[],
  speakerLabel: string,
  questionTexts: string[]
): StarEventReport {
  const { questions, summary } = buildQuizSection(event.id);
  const {
    prePostLearning,
    pairedRespondents,
    preRespondents,
    postRespondents,
  } = buildPrePostSection(rows, questionTexts);
  return {
    eventId: event.id,
    title: event.title,
    topic: event.category || "General",
    speaker: speakerLabel,
    eventType: event.event_type,
    displayDate: formatEventDateTime(event),
    quizQuestions: questions,
    quizSummary: summary,
    prePostLearning,
    pairedRespondents,
    preRespondents,
    postRespondents,
  };
}

export function buildStarReport(filters: StarReportFilters = {}): StarReport {
  const allEvents = readDB<Event>("events");
  const bridges = readDB<Bridge>("bridges");
  const bridge = filters.bridge_id ? bridges.find((item) => item.id === filters.bridge_id) : null;
  let events = filters.bridge_id
    ? bridge ? getEventsForBridge(allEvents, bridge, bridges) : []
    : getMainEvents(allEvents, bridges);
  if (filters.organizer_id) {
    const hostId = filters.organizer_id;
    events = events.filter((e) => isEventHost(e, hostId));
  }
  if (filters.topic) {
    events = events.filter((e) => (e.category || "General") === filters.topic);
  }
  if (filters.event_id) {
    events = events.filter((e) => e.id === filters.event_id);
  }

  const usersById = new Map(
    readDB<User>("users").map((u) => [u.id, u] as const)
  );
  const questionTexts = filters.bridge_id
    ? (getBridgeSettings(filters.bridge_id)?.pre_test?.questions ?? []).map((question) => question.question.trim()).filter(Boolean)
    : getLearningQuestionTexts();

  const speakerMap = new Map<string, { name: string; eventCount: number }>();
  for (const e of events) {
    const keys = eventSpeakerKeys(e);
    if (keys.length === 0) continue;
    for (const key of keys) {
      const name = key.startsWith("id:")
        ? speakerDisplayNameForId(key.slice(3), e, usersById)
        : speakerDisplayName(e, usersById);
      const prev = speakerMap.get(key);
      if (prev) {
        prev.eventCount += 1;
        if (key.startsWith("id:") && name !== "—") prev.name = name;
      } else {
        speakerMap.set(key, { name, eventCount: 1 });
      }
    }
  }
  const speakers: StarSpeakerOption[] = [...speakerMap.entries()]
    .map(([key, { name, eventCount }]) => ({ key, name, eventCount }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Accept new keys (`id:` / `name:`) and legacy plain display names
  const selectedSpeakers = (filters.speakers ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

  if (selectedSpeakers.length > 0) {
    const selectedKeys = new Set(selectedSpeakers);
    const selectedPlainNames = new Set(
      selectedSpeakers
        .filter((s) => !s.startsWith("id:") && !s.startsWith("name:"))
        .map((s) => s.trim().toLowerCase())
    );
    const selectedIds = selectedSpeakers
      .filter((s) => s.startsWith("id:"))
      .map((s) => s.slice(3));
    events = events.filter((e) => {
      const keys = eventSpeakerKeys(e);
      if (keys.some((k) => selectedKeys.has(k))) return true;
      if (selectedIds.some((id) => isAssignedSpeaker(e, id))) return true;
      const name = (e.speaker || "").trim().toLowerCase();
      if (name && selectedPlainNames.has(name)) return true;
      for (const id of eventSpeakerIds(e)) {
        const user = usersById.get(id);
        const full = user?.full_name?.trim().toLowerCase();
        if (full && selectedPlainNames.has(full)) return true;
      }
      return false;
    });
  }

  const eventIds = new Set(events.map((e) => e.id));

  const { rows } = buildSurveyResultReport({
    bridge_id: filters.bridge_id,
    topic: filters.topic,
    event_id: filters.event_id,
    organizer_id: filters.organizer_id,
    require_cert: false,
  });

  const rowsByEvent = new Map<string, SurveyResultRow[]>();
  for (const r of rows) {
    if (!eventIds.has(r.eventId)) continue;
    if (!rowsByEvent.has(r.eventId)) rowsByEvent.set(r.eventId, []);
    rowsByEvent.get(r.eventId)!.push(r);
  }

  const eventReports = events
    .slice()
    .sort((a, b) => {
      const da = `${a.event_date}T${a.start_time}`;
      const db = `${b.event_date}T${b.start_time}`;
      return da.localeCompare(db);
    })
    .map((ev) =>
      buildStarEventReport(
        ev,
        rowsByEvent.get(ev.id) ?? [],
        speakerDisplayName(ev, usersById),
        questionTexts
      )
    );

  return {
    speakers,
    selectedSpeakers,
    events: eventReports,
  };
}

export function starEventCsv(event: StarEventReport): string {
  const lines: string[] = [];
  lines.push(`"Webinar/Seminar","${event.title.replace(/"/g, '""')}"`);
  lines.push(`"Module","${event.topic.replace(/"/g, '""')}"`);
  lines.push(`"Speaker","${event.speaker.replace(/"/g, '""')}"`);
  lines.push(`"Date","${event.displayDate}"`);
  lines.push("");
  lines.push('"Quiz Questions"');
  lines.push('"Q#","Question","Option","Correct","Responses"');
  for (const q of event.quizQuestions) {
    for (const opt of q.options) {
      lines.push(
        [
          String(q.index),
          `"${q.question.replace(/"/g, '""')}"`,
          `"${opt.label}. ${opt.text.replace(/"/g, '""')}"`,
          opt.isCorrect ? "Yes" : "No",
          String(opt.count),
        ].join(",")
      );
    }
  }
  lines.push("");
  lines.push('"Quiz Score Bands"');
  lines.push('"0-49","50-69","70-84","85-100","Attempts","Average %"');
  lines.push(
    [
      String(event.quizSummary.band0_49),
      String(event.quizSummary.band50_69),
      String(event.quizSummary.band70_84),
      String(event.quizSummary.band85_100),
      String(event.quizSummary.attempts),
      event.quizSummary.averagePct ?? "",
    ].join(",")
  );
  lines.push("");
  lines.push('"Pre vs Post Learning"');
  lines.push(
    '"Question","Pre Mean","Post Mean","Delta","Paired","Pre Respondents","Post Respondents"'
  );
  for (const row of event.prePostLearning) {
    lines.push(
      [
        `"${row.question.replace(/"/g, '""')}"`,
        row.preMean ?? "",
        row.postMean ?? "",
        row.delta ?? "",
        String(row.pairedCount),
        String(event.preRespondents),
        String(event.postRespondents),
      ].join(",")
    );
  }
  return lines.join("\n");
}
