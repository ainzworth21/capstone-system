"use client";
import { useState } from "react";
import { Survey, SurveyQuestion } from "@/lib/types";
import {
  CVSU_POST_SURVEY_QUESTIONS,
  CVSU_SURVEY_SLOT_COUNT,
} from "@/lib/cvsu-post-survey";

function cid() { return Math.random().toString(36).slice(2, 10); }

function emptyQuestion() {
  return { id: cid(), question: "", type: "multiple_choice" as const, options: ["", ""] };
}

export default function GlobalSurveyEditor({ initialData, bridgeId }: { initialData: Survey | null; bridgeId?: string }) {
  const [isActive, setIsActive] = useState(initialData?.is_active ?? false);
  const slotCount = Math.max(
    CVSU_SURVEY_SLOT_COUNT,
    initialData?.questions.length ?? 0
  );
  const initial = Array.from({ length: slotCount }, (_, i) =>
    initialData?.questions[i] ?? emptyQuestion()
  );
  const [questions, setQuestions] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function loadCvsuTemplate() {
    setQuestions(CVSU_POST_SURVEY_QUESTIONS.map((q) => ({ ...q })));
    setIsActive(true);
    setMsg("");
  }

  function updateQuestion(id: string, changes: Partial<SurveyQuestion>) {
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
    const toSave = questions.filter((q) => q.question.trim() !== "");
    setSaving(true); setMsg("");
    const res = await fetch(bridgeId ? `/api/bridges/${bridgeId}/settings` : "/api/settings/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bridgeId
        ? { section: "post_test", data: { is_active: isActive, questions: toSave } }
        : { is_active: isActive, questions: toSave }),
    });
    setSaving(false);
    setMsg(res.ok ? `${bridgeId ? "Bridge post-test" : "Global survey"} saved!` : "Failed to save.");
  }

  return (
    <div>
      {/* Active toggle */}
      <div className="card card-gold" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{bridgeId ? "Bridge Post-test Status" : "Global Survey Status"}</div>
            <div style={{ fontSize: ".875rem", color: "var(--gray-500)" }}>
              {bridgeId ? "When active, participants in this Bridge can complete its post-test." : "When active, all students see the Survey button for attended events."}
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
      </div>

      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>{bridgeId ? "Bridge Post-test" : "Global Post-Evaluation Survey"}</h3>
          <p className="text-muted" style={{ fontSize: ".875rem", marginTop: ".375rem" }}>
            {bridgeId ? "This post-test is stored only for this Bridge and does not change the main event survey." : "CvSU format: 14 rating items + Comments + Recommendations. Demographics are collected at registration."}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {!bridgeId && <a
            href="/dashboard/settings/preview/survey"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            Preview
          </a>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadCvsuTemplate}>
            Load CvSU Template
          </button>
        </div>
      </div>

      {msg && <div className={`alert alert-${!msg.toLowerCase().startsWith("failed") && !msg.toLowerCase().includes("error") ? "success" : "error"}`} style={{ marginBottom: "1rem" }}>{msg}</div>}

      {questions.map((q, idx) => (
        <div key={q.id} className="card" style={{ marginBottom: "1rem", borderLeft: q.question.trim() ? "4px solid var(--gold)" : "4px solid var(--border)" }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--gray-500)", marginBottom: ".75rem" }}>Question {idx + 1}</div>

            <div className="form-group">
              <label className="form-label">Question Text</label>
              <input className="form-control" value={q.question} placeholder={`Question ${idx + 1} (leave blank to skip)`}
                onChange={(e) => updateQuestion(q.id, { question: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Answer Type</label>
              <select className="form-control" value={q.type}
                onChange={(e) => updateQuestion(q.id, { type: e.target.value as SurveyQuestion["type"] })}>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="rating">Star Rating (1–5)</option>
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
                <div className="form-hint">{(q.options ?? []).length} options</div>
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
        <button className="btn btn-gold btn-lg" onClick={save} disabled={saving} type="button">
          {saving ? "Saving…" : "Save Survey"}
        </button>
      </div>
    </div>
  );
}
