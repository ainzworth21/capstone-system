"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Survey } from "@/lib/types";
import {
  CVSU_SURVEY_SECTIONS,
} from "@/lib/cvsu-post-survey";
import { surveyPartDividerAt } from "@/lib/cvsu-survey-parts";
import { CVSU_LEARNING_RATING_LABELS } from "@/lib/cvsu-learning-questions";
import SurveyPartDivider from "@/components/SurveyPartDivider";

const AGREE_LABELS: Record<number, string> = {
  5: "Strongly Agree",
  4: "Agree",
  3: "Neutral",
  2: "Disagree",
  1: "Strongly Disagree",
};

const SATISFACTION_LABELS: Record<number, string> = {
  5: "Greatly exceeded",
  4: "Exceeded",
  3: "Met expectations",
  2: "Less than expected",
  1: "Much less than expected",
};

function sectionForIndex(idx: number) {
  let current = CVSU_SURVEY_SECTIONS[0];
  for (const s of CVSU_SURVEY_SECTIONS) {
    if (idx >= s.start) current = s;
  }
  return current;
}

function isCvsuSurvey(survey: Survey) {
  return survey.questions.some((q) => q.id.startsWith("p1-"));
}

export default function SurveyForm({ survey, eventId, participantId }: {
  survey: Survey; eventId: string; participantId: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setAnswer(qId: string, val: string) { setAnswers((a) => ({ ...a, [qId]: val })); }
  const allAnswered = survey.questions.every((q) => (answers[q.id] ?? "").trim() !== "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) { setError("Please answer all questions."); return; }
    setError(""); setLoading(true);
    const res = await fetch("/api/survey/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, participant_id: participantId, answers }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/speaker/my-events?survey=done`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      {isCvsuSurvey(survey) && (
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid var(--gold)" }}>
          <div className="card-body" style={{ fontSize: ".875rem" }}>
            <div style={{ fontWeight: 700, marginBottom: ".5rem" }}>Respondents Evaluation</div>
            <p className="text-muted" style={{ margin: 0 }}>
              Rate each statement using the scale shown in each section.
            </p>
          </div>
        </div>
      )}
      {survey.questions.map((q, idx) => {
        const cvsu = isCvsuSurvey(survey);
        const section = cvsu ? sectionForIndex(idx) : null;
        const partLabel = cvsu ? surveyPartDividerAt(idx) : null;
        const showSection =
          cvsu && (idx === 0 || sectionForIndex(idx - 1).title !== section?.title);
        const satisfaction = q.id === "p1-satisfaction";
        const learning = q.id.startsWith("p2-");
        const ratingLabels = satisfaction
          ? SATISFACTION_LABELS
          : learning
            ? CVSU_LEARNING_RATING_LABELS
            : AGREE_LABELS;

        return (
        <div key={q.id}>
          {partLabel && <SurveyPartDivider label={partLabel} />}
          {showSection && section && (
            <div style={{ margin: idx === 0 ? "0 0 1rem" : "1.5rem 0 1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: ".35rem" }}>
                {section.title}
              </h3>
              {section.hint && (
                <p className="text-muted" style={{ fontSize: ".78rem", margin: 0 }}>
                  {section.hint}
                </p>
              )}
            </div>
          )}
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, marginBottom: ".875rem" }}>{idx + 1}. {q.question}</div>
            {q.type === "rating" ? (
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <label key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", gap: ".25rem", minWidth: 72 }}>
                    <input type="radio" name={q.id} value={String(n)}
                      checked={answers[q.id] === String(n)}
                      onChange={() => setAnswer(q.id, String(n))}
                      style={{ accentColor: "var(--gold)" }} />
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>{n}</span>
                    <span style={{ fontSize: ".68rem", color: "var(--gray-500)", textAlign: "center", lineHeight: 1.2 }}>
                      {ratingLabels[n]}
                    </span>
                  </label>
                ))}
              </div>
            ) : q.type === "multiple_choice" && q.options ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                {q.options.map((opt) => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer", padding: ".625rem .875rem", border: `2px solid ${answers[q.id] === opt ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius)", background: answers[q.id] === opt ? "var(--gold-light)" : "var(--surface)", transition: "all .15s" }}>
                    <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)} style={{ accentColor: "var(--primary)" }} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <textarea className="form-control" rows={3} placeholder="Your answer…"
                value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
            )}
          </div>
        </div>
        </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button type="submit" className="btn btn-gold btn-lg" disabled={loading || !allAnswered}>
          {loading ? "Submitting…" : "Submit Survey"}
        </button>
      </div>
    </form>
  );
}
