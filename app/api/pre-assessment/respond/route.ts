import { NextRequest, NextResponse } from "next/server";
import { readDB, insertOne, findOne } from "@/lib/db";
import { AssessmentResponse, Participant, QuizAttempt } from "@/lib/types";
import { generateId, now } from "@/lib/utils";

/**
 * Pre-assessment runs immediately after registration (often before login).
 * Harden by requiring a real participant whose event_id matches the body.
 */
export async function POST(req: NextRequest) {
  const { event_id, participant_id, answers } = await req.json();
  if (!event_id || !participant_id) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const participant = findOne<Participant>("participants", (p) => p.id === participant_id);
  if (!participant || participant.event_id !== event_id) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  const existing = readDB<AssessmentResponse>("assessment_responses").find(
    (r) => r.event_id === event_id && r.participant_id === participant_id
  );
  if (existing) return NextResponse.json({ ok: true, already: true });

  const quizAttempt = findOne<QuizAttempt>("quiz_attempts", (attempt) =>
    attempt.event_id === event_id && attempt.participant_id === participant_id
  );
  if (quizAttempt) {
    return NextResponse.json({ error: "The pre-test must be completed before starting the quiz." }, { status: 409 });
  }

  insertOne<AssessmentResponse>("assessment_responses", {
    id: generateId(),
    event_id,
    participant_id,
    answers: answers ?? {},
    submitted_at: now(),
  });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const participant_id = searchParams.get("participant_id");

  if (!event_id || !participant_id) return NextResponse.json(null);

  const participant = findOne<Participant>("participants", (p) => p.id === participant_id);
  if (!participant || participant.event_id !== event_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = findOne<AssessmentResponse>("assessment_responses",
    (r) => r.event_id === event_id && r.participant_id === participant_id
  );
  return NextResponse.json(response ?? null);
}
