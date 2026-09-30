import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne } from "@/lib/db";
import { AssessmentResponse, Event, Quiz, QuizAttempt, Participant } from "@/lib/types";
import Navbar from "@/components/Navbar";
import QuizForm, { StudentQuiz } from "./QuizForm";
import Link from "next/link";
import { getPreTestForEvent } from "@/lib/bridge-settings";

export default async function StudentQuizPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) notFound();

  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === eventId);
  if (!quiz || !quiz.is_active) {
    return (
      <>
        <Navbar user={user} />
        <div className="container" style={{ maxWidth: 560, padding: "3rem 1.5rem", textAlign: "center" }}>
          <h2>Quiz Not Available</h2>
          <p className="text-muted" style={{ margin: "1rem 0 2rem" }}>The quiz for this event is not active yet.</p>
          <Link href="/student/my-events" className="btn btn-gold">Back to My Events</Link>
        </div>
      </>
    );
  }

  const participant = findOne<Participant>("participants",
    (p) => p.event_id === eventId && p.email.toLowerCase() === user.email.toLowerCase() && p.status !== "cancelled"
  );
  if (!participant) notFound();

  const attempt = findOne<QuizAttempt>("quiz_attempts",
    (a) => a.event_id === eventId && a.participant_id === participant.id
  );
  const preTest = getPreTestForEvent(eventId);
  const preTestDone = !!preTest && !!findOne<AssessmentResponse>(
    "assessment_responses",
    (response) => response.event_id === eventId && response.participant_id === participant.id
  );

  if (!attempt && (participant.status !== "attended" || !preTestDone)) {
    const message = !preTest
      ? "The pre-test is not configured for this event yet."
      : !preTestDone
        ? "Complete the pre-test before starting the quiz."
        : "The quiz opens after your attendance is recorded.";
    return (
      <>
        <Navbar user={user} />
        <div className="container" style={{ maxWidth: 560, padding: "3rem 1.5rem", textAlign: "center" }}>
          <h2>Quiz Locked</h2>
          <p className="text-muted" style={{ margin: "1rem 0 2rem" }}>{message}</p>
          {preTest && !preTestDone && <Link href={`/pre-assessment/${eventId}?participant_id=${participant.id}`} className="btn btn-gold">Complete Pre-test</Link>}{" "}
          <Link href="/student/my-events" className="btn btn-secondary">Back to My Events</Link>
        </div>
      </>
    );
  }

  // Hide correct answers for students
  const safeQuiz: StudentQuiz = {
    ...quiz,
    questions: quiz.questions.map(({ id, question, options, points }) => ({ id, question, options, points })),
  };

  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 700, padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: ".375rem" }}>Post-Event Quiz</h2>
          <p className="text-muted">{event.title}</p>
          <div style={{ marginTop: ".75rem", fontSize: ".9rem", color: "var(--gray-500)" }}>
            Passing score: <strong style={{ color: "var(--primary)" }}>{quiz.passing_score}%</strong>
            &nbsp;·&nbsp; {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""}
          </div>
        </div>

        {attempt ? (
          <div className="card">
            <div className="card-body empty-state">
              <h3 style={{ marginBottom: ".5rem" }}>
                {attempt.passed ? "Quiz Passed" : "Quiz Submitted"}
              </h3>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: attempt.passed ? "var(--primary)" : "var(--danger)", margin: "1rem 0" }}>
                {attempt.score}%
              </div>
              <p className="text-muted">
                {attempt.passed
                  ? `Congratulations! You passed with ${attempt.score}%.`
                  : `You scored ${attempt.score}%. Passing score is ${quiz.passing_score}%.`}
              </p>
              <div style={{ marginTop: "2rem" }}>
                <Link href="/student/my-events" className="btn btn-gold">Back to My Events</Link>
              </div>
            </div>
          </div>
        ) : (
          <QuizForm quiz={safeQuiz} eventId={eventId} participantId={participant.id} />
        )}
      </div>
      <footer className="footer"><p>© {new Date().getFullYear()} CvSU Campus Event Management System</p></footer>
    </>
  );
}
