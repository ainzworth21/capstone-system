import { getSessionUser } from "@/lib/session";
import { findOne, readDB } from "@/lib/db";
import { Event, Quiz, User } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export default async function SpeakerQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const speaker = findOne<User>("users", (u) => u.id === id && u.role === "organizer");
  if (!speaker) notFound();

  const events = readDB<Event>("events")
    .filter((e) => e.organizer_id === id)
    .sort((a, b) => b.event_date.localeCompare(a.event_date));
  const quizzes = readDB<Quiz>("quizzes");

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">All Questions by this Speaker</h1>
          <p className="text-muted">
            {speaker.full_name}
            {speaker.title_position ? ` · ${speaker.title_position}` : ""}
            {speaker.affiliation ? ` · ${speaker.affiliation}` : ""}
          </p>
        </div>
        <Link href="/dashboard/speakers" className="btn btn-secondary">
          Back to Speakers
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card">
          <div className="card-body text-muted">No events for this speaker yet.</div>
        </div>
      ) : (
        <div className="speaker-questions-stack">
          {events.map((ev) => {
            const quiz = quizzes.find((q) => q.event_id === ev.id);
            const questions = (quiz?.questions ?? []).filter((q) => q.question.trim());
            return (
              <div key={ev.id} className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{ev.title}</h3>
                    <p className="text-muted" style={{ margin: ".25rem 0 0", fontSize: ".85rem" }}>
                      {formatDate(ev.event_date)} · {ev.event_type} · {questions.length} question
                      {questions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: ".5rem" }}>
                    <Link
                      href={`/dashboard/speakers/preview/${ev.id}`}
                      className="btn btn-sm btn-secondary"
                    >
                      Preview Form
                    </Link>
                    <Link
                      href={`/dashboard/questions?type=quiz&event_id=${ev.id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Edit Quiz
                    </Link>
                  </div>
                </div>
                <div className="card-body">
                  {questions.length === 0 ? (
                    <p className="text-muted">No quiz questions set for this event.</p>
                  ) : (
                    <ol className="quiz-preview-list">
                      {questions.map((q, i) => (
                        <li key={q.id}>
                          <div className="quiz-preview-q">
                            Q{i + 1}. {q.question}
                          </div>
                          <ul className="quiz-preview-opts">
                            {(q.options ?? []).map((opt, oi) => {
                              const letter = String.fromCharCode(65 + oi);
                              const correct =
                                opt.trim().toLowerCase() ===
                                (q.correct_answer ?? "").trim().toLowerCase();
                              return (
                                <li key={oi} className={correct ? "is-correct" : undefined}>
                                  ({letter}) {opt}
                                  {correct && (
                                    <span className="badge badge-approved" style={{ marginLeft: ".5rem" }}>
                                      Correct
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
