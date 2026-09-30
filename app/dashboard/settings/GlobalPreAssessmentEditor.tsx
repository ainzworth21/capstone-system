"use client";
import { useState } from "react";
import { AssessmentQuestion, PreAssessment } from "@/lib/types";
import {
  cvsuPreAssessmentTemplate,
  CVSU_PRE_SLOT_COUNT,
} from "@/lib/cvsu-pre-assessment";

function cid() { return Math.random().toString(36).slice(2, 10); }

function emptyQuestion(): AssessmentQuestion {
  return {
    id: cid(),
    question: "",
    type: "rating",
    options: ["5", "4", "3", "2", "1"],
  };
}

export default function GlobalPreAssessmentEditor({ initialData, bridgeId }: { initialData: PreAssessment | null; bridgeId?: string }) {
  const initial = Array.from({ length: CVSU_PRE_SLOT_COUNT }, (_, i) =>
    initialData?.questions[i] ?? emptyQuestion()
  );
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function loadCvsuTemplate() {
    setQuestions(cvsuPreAssessmentTemplate().map((q) => ({ ...q })));
    setMsg("");
  }

  function updateQuestion(id: string, changes: Partial<AssessmentQuestion>) {
    setQuestions((q) => q.map((x) => x.id === id ? { ...x, ...changes } : x));
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
    // Only save questions that have content
    const toSave = questions.filter((q) => q.question.trim() !== "");
    setSaving(true); setMsg("");
    const res = await fetch(bridgeId ? `/api/bridges/${bridgeId}/settings` : "/api/settings/pre-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bridgeId
        ? { section: "pre_test", data: { questions: toSave } }
        : { questions: toSave }),
    });
    setSaving(false);
    setMsg(res.ok ? `${bridgeId ? "Bridge" : "Global"} pre-test saved!` : "Failed to save.");
  }

  return (
    <div>
      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
            <h3 style={{ margin: 0 }}>{bridgeId ? "Bridge Pre-test" : "Global Pre-Assessment"}</h3>
          <p className="text-muted" style={{ fontSize: ".875rem", marginTop: ".375rem" }}>
            {bridgeId ? "This pre-test is stored only for this Bridge and is shown to its participants." : "CvSU post-evaluation (P1), feedback, and pre vs post learning questions (P2 Q1–Q5)."}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {!bridgeId && <a
            href="/dashboard/settings/preview/pre-assessment"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            Preview
          </a>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadCvsuTemplate}>
            Reset to Default Questions
          </button>
        </div>
      </div>

      {msg && <div className={`alert alert-${!msg.toLowerCase().startsWith("failed") && !msg.toLowerCase().includes("error") ? "success" : "error"}`} style={{ marginBottom: "1rem" }}>{msg}</div>}

      {questions.map((q, idx) => (
        <div key={q.id} className="card" style={{ marginBottom: "1rem", borderLeft: q.question.trim() ? "4px solid var(--gold)" : "4px solid var(--border)" }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--gray-500)", marginBottom: ".75rem" }}>
              Question {idx + 1}
            </div>

            <div className="form-group">
              <label className="form-label">Question Text</label>
              <input className="form-control" value={q.question} placeholder={`Question ${idx + 1} (leave blank to skip)`}
                onChange={(e) => updateQuestion(q.id, { question: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Answer Type</label>
              <select className="form-control" value={q.type}
                onChange={(e) => updateQuestion(q.id, { type: e.target.value as AssessmentQuestion["type"] })}>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="rating">Likert Rating (5–1)</option>
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
                <button className="btn btn-secondary btn-sm" onClick={() => addOption(q.id)} type="button">Add Answer Option</button>
                <div className="form-hint">{(q.options ?? []).length} options (minimum 2)</div>
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button className="btn btn-gold btn-lg" onClick={save} disabled={saving} type="button">
          {saving ? "Saving…" : "Save Pre-Assessment"}
        </button>
      </div>
    </div>
  );
}
