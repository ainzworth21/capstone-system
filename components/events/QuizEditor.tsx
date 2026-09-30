"use client";
import { useState } from "react";
import { Quiz, QuizQuestion } from "@/lib/types";

function cid() { return Math.random().toString(36).slice(2, 10); }
function emptyQuestion(): QuizQuestion {
  return { id: cid(), question: "", options: ["", "", "", ""], correct_answer: "", points: 1 };
}
const TOTAL = 10;

export default function QuizEditor({ eventId, initialData, previewHref }: {
  eventId: string; initialData: Quiz | null; previewHref?: string;
}) {
  const [isActive, setIsActive]         = useState(initialData?.is_active ?? false);
  const [passingScore, setPassingScore] = useState(initialData?.passing_score ?? 70);
  const initial = Array.from({ length: TOTAL }, (_, i) =>
    initialData?.questions[i] ?? emptyQuestion()
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>(initial);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");

  function updateQuestion(id: string, field: string, value: any) {
    setQuestions((q) => q.map((x) => x.id === id ? { ...x, [field]: value } : x));
  }
  function updateOption(qId: string, idx: number, val: string) {
    setQuestions((q) => q.map((x) => {
      if (x.id !== qId) return x;
      const opts = [...x.options]; opts[idx] = val;
      const correct = x.correct_answer === x.options[idx] ? val : x.correct_answer;
      return { ...x, options: opts, correct_answer: correct };
    }));
  }
  function addOption(qId: string) {
    setQuestions((q) => q.map((x) => x.id === qId ? { ...x, options: [...x.options, ""] } : x));
  }
  function removeOption(qId: string, idx: number) {
    setQuestions((q) => q.map((x) => {
      if (x.id !== qId) return x;
      const opts = x.options.filter((_, i) => i !== idx);
      const correct = x.correct_answer === x.options[idx] ? "" : x.correct_answer;
      return { ...x, options: opts, correct_answer: correct };
    }));
  }

  async function save() {
    const toSave = questions.filter((q) => q.question.trim() !== "");
    setSaving(true); setMsg("");
    const res = await fetch(`/api/quiz/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive, passing_score: passingScore, questions: toSave }),
    });
    setSaving(false);
    setMsg(res.ok ? "Quiz saved!" : "Failed to save.");
  }

  return (
    <div>
      {/* Status & settings */}
      <div className="card card-gold" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Quiz Status</div>
              <div style={{ fontSize: ".875rem", color: "var(--gray-500)" }}>
                When active, the Quiz button is enabled for participants.
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer" }}>
              <span style={{ fontWeight: 600, color: isActive ? "var(--primary)" : "var(--gray-500)" }}>
                {isActive ? "Active" : "Inactive"}
              </span>
              <div style={{ position: "relative", width: 48, height: 26 }} onClick={() => setIsActive((v) => !v)}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 13, background: isActive ? "var(--primary)" : "var(--gray-300)", transition: "background .2s" }} />
                <div style={{ position: "absolute", top: 3, left: isActive ? 26 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
              </div>
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
            <label className="form-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Passing Score (%)</label>
            <input type="number" className="form-control" min={0} max={100} style={{ width: 80 }}
              value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Quiz — 10 Questions</h3>
          <p className="text-muted" style={{ fontSize: ".875rem", marginTop: ".375rem" }}>
            Fill in questions and mark the correct answer for each. Leave blank to skip.
          </p>
        </div>
        <a
          href={previewHref ?? `/dashboard/preview/quiz/${eventId}?from=manage`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Preview
        </a>
      </div>

      {msg && (
        <div className={`alert alert-${!msg.toLowerCase().startsWith("failed") && !msg.toLowerCase().includes("error") ? "success" : "error"}`} style={{ marginBottom: "1rem" }}>{msg}</div>
      )}

      {questions.map((q, idx) => (
        <div key={q.id} className="card" style={{ marginBottom: "1rem", borderLeft: q.question.trim() ? "4px solid var(--gold)" : "4px solid var(--border)" }}>
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".875rem", gap: "1rem" }}>
              <div style={{ fontWeight: 700, fontSize: ".9rem", color: q.question.trim() ? "var(--primary-dark)" : "var(--gray-400)" }}>
                Question {idx + 1} {!q.question.trim() && <span style={{ fontStyle: "italic", fontWeight: 400 }}>(blank — will be skipped)</span>}
              </div>
              <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexShrink: 0 }}>
                <label className="form-label" style={{ margin: 0, fontSize: ".8rem" }}>Points</label>
                <input type="number" className="form-control" min={1} style={{ width: 64, padding: ".3rem .5rem" }}
                  value={q.points} onChange={(e) => updateQuestion(q.id, "points", Number(e.target.value))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Question Text</label>
              <input className="form-control" value={q.question}
                placeholder={`Question ${idx + 1} — leave blank to skip`}
                onChange={(e) => updateQuestion(q.id, "question", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Answer Options
                <span style={{ fontWeight: 400, color: "var(--gray-500)", marginLeft: ".5rem", fontSize: ".8125rem" }}>
                  click radio to mark correct
                </span>
              </label>
              {q.options.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem", alignItems: "center" }}>
                  <input type="radio" name={`correct_${q.id}`} value={opt}
                    checked={!!opt.trim() && q.correct_answer === opt}
                    onChange={() => opt.trim() && updateQuestion(q.id, "correct_answer", opt)}
                    title="Mark as correct answer"
                    style={{ accentColor: "var(--primary)", flexShrink: 0 }} />
                  <span style={{ minWidth: 20, fontSize: ".8125rem", color: "var(--gray-500)", fontWeight: 600 }}>{i + 1}.</span>
                  <input className="form-control" value={opt} placeholder={`Option ${i + 1}`}
                    onChange={(e) => updateOption(q.id, i, e.target.value)} />
                  {q.options.length > 2 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => removeOption(q.id, i)} type="button">Remove</button>
                  )}
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => addOption(q.id)} type="button">Add Option</button>
              <div className="form-hint">{q.options.length} options (min 2)</div>
            </div>

            {q.correct_answer && (
              <div style={{ padding: ".5rem .875rem", background: "var(--primary-light)", borderRadius: "var(--radius)", fontSize: ".875rem", color: "var(--primary-dark)", fontWeight: 600 }}>
                Correct answer: {q.correct_answer}
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button className="btn btn-gold btn-lg" onClick={save} disabled={saving} type="button">
          {saving ? "Saving…" : "Save Quiz"}
        </button>
      </div>
    </div>
  );
}
