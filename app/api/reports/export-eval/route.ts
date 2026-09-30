import { NextRequest, NextResponse } from "next/server";
import { readDB, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  Participant,
  Event,
  AssessmentResponse,
  SurveyResponse,
  QuizAttempt,
} from "@/lib/types";
import { Bridge } from "@/lib/types";
import { getEventsForBridge } from "@/lib/bridge";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(req.url).searchParams;
  const eventId = searchParams.get("event_id");
  const bridgeId = searchParams.get("bridge_id");
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (bridgeId) {
    const bridges = readDB<Bridge>("bridges");
    const bridge = bridges.find((item) => item.id === bridgeId);
    if (!bridge || getEventsForBridge([event], bridge, bridges).length === 0) {
      return NextResponse.json({ error: "Event does not belong to this Bridge." }, { status: 404 });
    }
  }
  if (user.role === "organizer" && event.organizer_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participants = readDB<Participant>("participants")
    .filter((p) => p.event_id === eventId && p.status !== "cancelled");

  const preMap = new Map(
    readDB<AssessmentResponse>("assessment_responses")
      .filter((r) => r.event_id === eventId)
      .map((r) => [r.participant_id, r])
  );
  const surveyMap = new Map(
    readDB<SurveyResponse>("survey_responses")
      .filter((r) => r.event_id === eventId)
      .map((r) => [r.participant_id, r])
  );
  const quizMap = new Map(
    readDB<QuizAttempt>("quiz_attempts")
      .filter((a) => a.event_id === eventId)
      .map((a) => [a.participant_id, a])
  );

  const headers = [
    "Full Name",
    "Student ID",
    "Email",
    "Course",
    "Year Level",
    "Status",
    "Pre-test Done",
    "Post-test Done",
    "Quiz Score",
    "Quiz Passed",
    "Registered At",
  ];

  const rows = participants.map((p) => {
    const pre = preMap.get(p.id);
    const survey = surveyMap.get(p.id);
    const quiz = quizMap.get(p.id);
    return [
      p.full_name,
      p.student_id,
      p.email,
      p.course,
      p.year_level,
      p.status,
      pre ? "Yes" : "No",
      survey ? "Yes" : "No",
      quiz ? String(quiz.score) : "",
      quiz ? (quiz.passed ? "Yes" : "No") : "",
      new Date(p.registered_at).toLocaleString(),
    ];
  });

  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const filename = `eval_${event.title.replace(/\s+/g, "_")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
