import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne } from "@/lib/db";
import { AssessmentResponse, Event, Participant, Quiz, QuizAttempt, SurveyResponse } from "@/lib/types";
import SurveyForm from "./SurveyForm";
import Link from "next/link";
import { getPostTestForEvent } from "@/lib/bridge-settings";
import { getPreTestForEvent } from "@/lib/bridge-settings";

export default async function StudentSurveyPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user) return notFound();

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) notFound();

  // Global survey only
  const survey = getPostTestForEvent(eventId);
  const questions = (survey?.questions ?? []).filter((q) => q.question.trim() !== "");

  if (!survey || !survey.is_active || questions.length === 0) {
    return (
      <>
        <div className="container" style={{ maxWidth: 560, padding: "3rem 1.5rem", textAlign: "center" }}>
          <h2>Survey Not Available</h2>
          <p className="text-muted" style={{ margin: "1rem 0 2rem" }}>The survey for this event is not active yet.</p>
          <Link href="/speaker/my-events" className="btn btn-gold">Back to My Events</Link>
        </div>
      </>
    );
  }

  const participant = findOne<Participant>("participants",
    (p) => p.event_id === eventId && p.email.toLowerCase() === user.email.toLowerCase() && p.status !== "cancelled"
  );
  if (!participant) notFound();

  const existing = findOne<SurveyResponse>("survey_responses",
    (r) => r.event_id === eventId && r.participant_id === participant.id
  );
  const preTest = getPreTestForEvent(eventId);
  const preTestDone = !!preTest && !!findOne<AssessmentResponse>("assessment_responses", (r) => r.event_id === eventId && r.participant_id === participant.id);
  const quiz = findOne<Quiz>("quizzes", (item) => item.event_id === eventId);
  const quizAttempt = findOne<QuizAttempt>("quiz_attempts", (item) => item.event_id === eventId && item.participant_id === participant.id);
  const lockMessage = existing ? "" : !preTest
    ? "The pre-test is not configured for this event yet."
    : !preTestDone
      ? "Complete the pre-test first."
      : participant.status !== "attended"
        ? "The Post-test opens after your attendance is recorded."
        : !quiz?.is_active
          ? "The quiz is not active for this event yet."
          : !quizAttempt
            ? "Complete the quiz before taking the Post-test."
            : "";

  const effectiveSurvey = { ...survey, questions };

  return (
    <>
      <div className="container" style={{ maxWidth: 680, padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: ".375rem" }}>Post Evaluation Survey</h2>
          <p className="text-muted">{event.title}</p>
        </div>

        {existing ? (
          <div className="card">
            <div className="card-body empty-state">
              <h3>Survey Already Submitted</h3>
              <p className="text-muted" style={{ margin: "1rem 0 2rem" }}>
                Thank you! You have already completed the survey for this event.
              </p>
              <Link href="/speaker/my-events" className="btn btn-gold">Back to My Events</Link>
            </div>
          </div>
        ) : lockMessage ? (
          <div className="card"><div className="card-body empty-state">
            <h3>Post-test Locked</h3>
            <p className="text-muted" style={{ margin: "1rem 0 2rem" }}>{lockMessage}</p>
            {preTest && !preTestDone ? <Link href={`/pre-assessment/${eventId}?participant_id=${participant.id}`} className="btn btn-gold">Complete Pre-test</Link> : quiz?.is_active && preTestDone && participant.status === "attended" && !quizAttempt ? <Link href={`/speaker/quiz/${eventId}`} className="btn btn-gold">Take Quiz</Link> : <Link href="/speaker/my-events" className="btn btn-secondary">Back to My Events</Link>}
          </div></div>
        ) : (
          <SurveyForm survey={effectiveSurvey} eventId={eventId} participantId={participant.id} />
        )}
      </div>
    </>
  );
}
