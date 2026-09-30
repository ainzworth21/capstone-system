import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Event, Quiz } from "@/lib/types";
import { generateId, now } from "@/lib/utils";
import { canManageEvent } from "@/lib/authz";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getSessionUser();
  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === eventId);
  if (!quiz) return NextResponse.json(null);

  const event = findOne<Event>("events", (e) => e.id === eventId);
  const showAnswers = canManageEvent(user, event);

  if (!showAnswers) {
    const safe = {
      ...quiz,
      questions: quiz.questions.map(({ correct_answer: _ca, ...q }) => q),
    };
    return NextResponse.json(safe);
  }
  return NextResponse.json(quiz);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!canManageEvent(user, event)) {
    return NextResponse.json(
      { error: "You can only edit quizzes for your own events." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const quizzes = readDB<Quiz>("quizzes");
  const existing = quizzes.findIndex((q) => q.event_id === eventId);

  const record: Quiz = {
    id: existing >= 0 ? quizzes[existing].id : generateId(),
    event_id: eventId,
    is_active: body.is_active ?? false,
    passing_score: body.passing_score ?? 70,
    questions: (body.questions ?? []).filter(
      (q: { question?: string }) => (q.question ?? "").trim() !== ""
    ),
    created_at: existing >= 0 ? quizzes[existing].created_at : now(),
  };

  if (existing >= 0) quizzes[existing] = record;
  else quizzes.push(record);
  writeDB("quizzes", quizzes);
  return NextResponse.json(record);
}
