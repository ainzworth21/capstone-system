"use client";
import { useState } from "react";
import { PreAssessment, AssessmentQuestion } from "@/lib/types";

function cid() { return Math.random().toString(36).slice(2, 10); }
function emptyQuestion(): AssessmentQuestion {
  return { id: cid(), question: "", type: "multiple_choice", options: ["", ""] };
}
const TOTAL = 10;

export default function PreAssessmentEditor({ eventId, initialData }: {
  eventId: string; initialData: PreAssessment | null;
}) {
  const initial = Array.from({ length: TOTAL }, (_, i) =>
    initialData?.questions[i] ?? emptyQuestion()
  );
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const hasContent = questions.some((q) => q.question.trim() !== "");

  function updateQuestion(id: string, field: string, value: any) {
    setQuestions((q) => q.map((x) => x.id === id ? { ...x, [field]: value } : x));
  }
  function addOption(qId: string) {
    setQuestions((q) => q.map((x) => x.id === qId ? { ...x, options: [...(x.options ?? []), ""] } : x));
  }
  function updateOption(qId: string, idx: number, val: string) {
    setQuestions((q) => q.map((x) => {
      if (x.id !== qId) return x;
      const opts = [...(x.options ?? [])]; opts[idx] = val;
      return { ...x, options: opts };
    }));
  }
  function removeOption(qId: string, idx: number) {
    setQuestions((q) => q.map((x) => x.id === qId
      ? { ...x, options: (x.options ?? []).filter((_, i) => i !== idx) }
      : x));
  }

  async function save() {
    const toSave = questions.filter((q) => q.question.trim() !== "");
    setSaving(true); setMsg("");
    const res = await fetch(`/api/pre-assessment/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: toSave }),
    });
    setSaving(false);
    setMsg(res.ok ? "Pre-assessment saved!" : "Failed to save.");
  }

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Pre-Assessment — 10 Questions</h3>
        <p className="text-muted" style={{ fontSize: ".875rem", marginTop: ".375rem" }}>
          Fill in the questions below. Leave a question blank to skip it.
          Students must answer all filled-in questions before they can register.
          No scoring — informational only.
        </p>
      </div>

      {msg && <div className={`alert alert-${!msg.toLowerCase().startsWith("failed") && !msg.toLowerCase().includes("error") ? "success" : "error"}`} style={{ marginBottom: "1rem" }}>{msg}</div>}

      {questions.map((q, idx) => (
        <div key={q.id} className="card" style={{ marginBottom: "1rem", borderLeft: q.question.trim() ? "4px solid var(--gold)" : "4px solid var(--border)" }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: q.question.trim() ? "var(--primary-dark)" : "var(--gray-400)", marginBottom: ".75rem" }}>
              Question {idx + 1} {!q.question.trim() && <span style={{ fontStyle: "italic", fontWeight: 400 }}>(blank — will be skipped)</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Question Text</label>
              <input className="form-control" value={q.question}
                placeholder={`Question ${idx + 1} — leave blank to skip`}
                onChange={(e) => updateQuestion(q.id, "question", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Answer Type</label>
              <select className="form-control" value={q.type}
                onChange={(e) => updateQuestion(q.id, "type", e.target.value as any)}>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="short_answer">Short Answer (text)</option>
              </select>
            </div>

            {q.type === "multiple_choice" && (
              <div className="form-group">
                <label className="form-label">Answer Options</label>
                {(q.options ?? []).map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
                    <span style={{ minWidth: 24, paddingTop: ".65rem", fontSize: ".8125rem", color: "var(--gray-500)", fontWeight: 600 }}>{i + 1}.</span>
                    <input className="form-control" value={opt} placeholder={`Option ${i + 1}`}
                      onChange={(e) => updateOption(q.id, i, e.target.value)} />
                    {(q.options ?? []).length > 2 && (
                      <button className="btn btn-secondary btn-sm" onClick={() => removeOption(q.id, i)} type="button">Remove</button>
                    )}
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => addOption(q.id)} type="button">Add Option</button>
                <div className="form-hint">{(q.options ?? []).length} options (min 2)</div>
              </div>
            )}
          </div>
        </div>
      ))}

      {hasContent && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <button className="btn btn-gold btn-lg" onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save Pre-Assessment"}
          </button>
        </div>
      )}
    </div>
  );
}
