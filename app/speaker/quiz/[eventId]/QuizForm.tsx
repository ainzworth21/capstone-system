"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Quiz } from "@/lib/types";

export default function QuizForm({ quiz, eventId, participantId }: {
  quiz: Quiz; eventId: string; participantId: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allAnswered = quiz.questions.every((q) => (answers[q.id] ?? "").trim() !== "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) { setError("Please answer all questions."); return; }
    setError(""); setLoading(true);
    const res = await fetch("/api/quiz/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, participant_id: participantId, answers }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="alert alert-warning" style={{ marginBottom: "1.5rem" }}>
        <span>You can only submit the quiz <strong>once</strong>. Make sure you&apos;ve reviewed your answers before submitting.</span>
      </div>

      {quiz.questions.map((q: any, idx: number) => (
        <div key={q.id} className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".875rem" }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", flex: 1 }}>{idx + 1}. {q.question}</div>
              <span style={{ fontSize: ".75rem", color: "var(--gray-500)", marginLeft: "1rem", whiteSpace: "nowrap" }}>
                {q.points} pt{q.points !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
              {q.options.map((opt: string) => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer", padding: ".625rem .875rem", border: `2px solid ${answers[q.id] === opt ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius)", background: answers[q.id] === opt ? "var(--primary-light)" : "var(--surface)", transition: "all .15s" }}>
                  <input type="radio" name={q.id} value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    style={{ accentColor: "var(--primary)" }} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button type="submit" className="btn btn-gold btn-lg" disabled={loading || !allAnswered}>
          {loading ? "Submitting…" : "Submit Quiz"}
        </button>
      </div>
    </form>
  );
}
