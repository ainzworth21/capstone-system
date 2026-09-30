import { NextRequest, NextResponse } from "next/server";
import { readDB, insertOne, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { AssessmentResponse, Quiz, QuizAttempt, Participant } from "@/lib/types";
import { generateId, now } from "@/lib/utils";
import { canManageEvent, isStaff } from "@/lib/authz";
import { Event } from "@/lib/types";
import { getPreTestForEvent } from "@/lib/bridge-settings";

async function assertParticipantAccess(participantId: string, eventId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };

  const participant = findOne<Participant>(
    "participants",
    (p) => p.id === participantId
  );
  if (!participant || participant.event_id !== eventId) {
    return { error: "Participant not found.", status: 404 as const };
  }

  if (isStaff(user)) {
    const event = findOne<Event>("events", (e) => e.id === eventId);
    if (!canManageEvent(user, event)) {
      return { error: "Forbidden", status: 403 as const };
    }
  } else if (participant.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Forbidden", status: 403 as const };
  }

  return { participant, user };
}

export async function POST(req: NextRequest) {
  const { event_id, participant_id, answers } = await req.json();
  if (!event_id || !participant_id) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const access = await assertParticipantAccess(participant_id, event_id);
  if ("error" in access && access.error) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === event_id);
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const existing = readDB<QuizAttempt>("quiz_attempts").find(
    (a) => a.event_id === event_id && a.participant_id === participant_id
  );
  if (existing) {
    return NextResponse.json({ ok: true, already: true, score: existing.score, passed: existing.passed });
  }

  if (!quiz.is_active) return NextResponse.json({ error: "Quiz is not active." }, { status: 400 });
  const preTest = getPreTestForEvent(event_id);
  if (!preTest) {
    return NextResponse.json({ error: "The pre-test is not configured for this event." }, { status: 409 });
  }
  const preTestDone = !!findOne<AssessmentResponse>("assessment_responses", (response) =>
    response.event_id === event_id && response.participant_id === participant_id
  );
  if (!preTestDone) {
    return NextResponse.json({ error: "Complete the pre-test before starting the quiz." }, { status: 409 });
  }
  if (access.participant.status !== "attended") {
    return NextResponse.json({ error: "The quiz opens after attendance is recorded." }, { status: 409 });
  }

  let correct = 0;
  let totalPoints = 0;
  quiz.questions.forEach((q) => {
    totalPoints += q.points;
    if ((answers[q.id] ?? "").trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
      correct += q.points;
    }
  });
  const score = totalPoints > 0 ? Math.round((correct / totalPoints) * 100) : 0;
  const passed = score >= quiz.passing_score;

  const attempt: QuizAttempt = {
    id: generateId(),
    quiz_id: quiz.id,
    event_id,
    participant_id,
    answers,
    score,
    passed,
    submitted_at: now(),
  };

  insertOne("quiz_attempts", attempt);
  return NextResponse.json({ ok: true, score, passed, passing_score: quiz.passing_score });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const participant_id = searchParams.get("participant_id");
  if (!event_id || !participant_id) return NextResponse.json(null);

  const access = await assertParticipantAccess(participant_id, event_id);
  if ("error" in access && access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const attempt = findOne<QuizAttempt>("quiz_attempts",
    (a) => a.event_id === event_id && a.participant_id === participant_id
  );
  return NextResponse.json(attempt ?? null);
}
