import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne } from "@/lib/db";
import { Event, Quiz, QuizAttempt, Participant } from "@/lib/types";
import QuizForm from "./QuizForm";
import Link from "next/link";

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
        <div className="container" style={{ maxWidth: 560, padding: "3rem 1.5rem", textAlign: "center" }}>
          <h2>Quiz Not Available</h2>
          <p className="text-muted" style={{ margin: "1rem 0 2rem" }}>The quiz for this event is not active yet.</p>
          <Link href="/speaker/my-events" className="btn btn-gold">Back to My Events</Link>
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

  // Hide correct answers for students
  const safeQuiz = { ...quiz, questions: quiz.questions.map(({ correct_answer: _ca, ...q }) => q) };

  return (
    <>
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
                <Link href="/speaker/my-events" className="btn btn-gold">Back to My Events</Link>
              </div>
            </div>
          </div>
        ) : (
          <QuizForm quiz={safeQuiz as any} eventId={eventId} participantId={participant.id} />
        )}
      </div>
    </>
  );
}
