"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PreAssessment } from "@/lib/types";
import { CVSU_AGREE_SCALE_HINT } from "@/lib/cvsu-post-survey";
import {
  CVSU_LEARNING_SCALE_HINT,
  CVSU_LEARNING_RATING_LABELS,
} from "@/lib/cvsu-learning-questions";
import { isCvsuPreAssessment } from "@/lib/cvsu-pre-assessment";

const AGREE_LABELS: Record<number, string> = {
  5: "Strongly Agree",
  4: "Agree",
  3: "Neutral",
  2: "Disagree",
  1: "Strongly Disagree",
};

interface Props {
  assessment: PreAssessment;
  eventId: string;
  participantId: string;
}

export default function PreAssessmentForm({ assessment, eventId, participantId }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasRating = assessment.questions.some((q) => q.type === "rating");
  const learningScale = isCvsuPreAssessment(assessment.questions);
  const ratingLabels = learningScale ? CVSU_LEARNING_RATING_LABELS : AGREE_LABELS;

  function setAnswer(qId: string, val: string) {
    setAnswers((a) => ({ ...a, [qId]: val }));
  }

  const allAnswered = assessment.questions.every((q) => (answers[q.id] ?? "").trim() !== "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) { setError("Please answer all questions before continuing."); return; }
    setError(""); setLoading(true);

    const res = await fetch("/api/pre-assessment/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, participant_id: participantId, answers }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to submit. Please try again.");
      return;
    }

    router.push(`/confirmation?pid=${participantId}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      {hasRating && (
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid var(--gold)" }}>
          <div className="card-body" style={{ fontSize: ".875rem" }}>
            <p className="text-muted" style={{ margin: 0 }}>
              {learningScale ? CVSU_LEARNING_SCALE_HINT : CVSU_AGREE_SCALE_HINT}
            </p>
          </div>
        </div>
      )}

      {assessment.questions.map((q, idx) => (
        <div key={q.id} className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, marginBottom: ".875rem", fontSize: "1rem" }}>
              {idx + 1}. {q.question}
            </div>
            {q.type === "rating" ? (
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <label
                    key={n}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                      gap: ".25rem",
                      minWidth: 72,
                    }}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={String(n)}
                      checked={answers[q.id] === String(n)}
                      onChange={() => setAnswer(q.id, String(n))}
                      style={{ accentColor: "var(--gold)" }}
                    />
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>
                      {n}
                    </span>
                    <span
                      style={{
                        fontSize: ".68rem",
                        color: "var(--gray-500)",
                        textAlign: "center",
                        lineHeight: 1.2,
                      }}
                    >
                      {ratingLabels[n]}
                    </span>
                  </label>
                ))}
              </div>
            ) : q.type === "multiple_choice" && q.options ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                {q.options.filter((o) => o.trim()).map((opt) => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer", padding: ".625rem .875rem", border: `2px solid ${answers[q.id] === opt ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius)", background: answers[q.id] === opt ? "var(--gold-light)" : "var(--surface)", transition: "all .15s" }}>
                    <input type="radio" name={q.id} value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                      style={{ accentColor: "var(--primary)" }} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <textarea className="form-control" rows={3} placeholder="Type your answer…"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)} />
            )}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button type="submit" className="btn btn-gold btn-lg" disabled={loading || !allAnswered}>
          {loading ? "Saving…" : "Submit & Continue"}
        </button>
      </div>
    </form>
  );
}
