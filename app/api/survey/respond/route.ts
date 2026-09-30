import { NextRequest, NextResponse } from "next/server";
import { readDB, insertOne, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { AssessmentResponse, Quiz, QuizAttempt, SurveyResponse, Participant, Event } from "@/lib/types";
import { generateId, now } from "@/lib/utils";
import { canManageEvent, isStaff } from "@/lib/authz";
import { getPostTestForEvent, getPreTestForEvent } from "@/lib/bridge-settings";

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

  const existing = readDB<SurveyResponse>("survey_responses").find(
    (r) => r.event_id === event_id && r.participant_id === participant_id
  );
  if (existing) return NextResponse.json({ ok: true, already: true });

  const preTest = getPreTestForEvent(event_id);
  const preTestDone = !!preTest && !!findOne<AssessmentResponse>("assessment_responses", (r) =>
    r.event_id === event_id && r.participant_id === participant_id
  );
  if (!preTestDone) {
    return NextResponse.json({ error: "Complete the pre-test before the quiz and post-test." }, { status: 409 });
  }
  const participant = access.participant;
  if (participant.status !== "attended") {
    return NextResponse.json({ error: "The post-test opens after attendance is recorded." }, { status: 409 });
  }
  const quiz = findOne<Quiz>("quizzes", (item) => item.event_id === event_id);
  const quizAttempt = quiz?.is_active
    ? findOne<QuizAttempt>("quiz_attempts", (item) => item.event_id === event_id && item.participant_id === participant_id)
    : null;
  if (!quizAttempt) {
    return NextResponse.json({ error: "Complete the quiz before taking the post-test." }, { status: 409 });
  }

  const survey = getPostTestForEvent(event_id);
  const questions = (survey?.questions ?? []).filter((q) => q.question.trim() !== "");
  if (!survey || questions.length === 0) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  }
  if (!survey.is_active) {
    return NextResponse.json({ error: "Survey is not active." }, { status: 400 });
  }

  insertOne<SurveyResponse>("survey_responses", {
    id: generateId(),
    survey_id: survey.id,
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

  const access = await assertParticipantAccess(participant_id, event_id);
  if ("error" in access && access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const response = findOne<SurveyResponse>("survey_responses",
    (r) => r.event_id === event_id && r.participant_id === participant_id
  );
  return NextResponse.json(response ?? null);
}
