"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Event, Quiz, QuizQuestion, Survey, SurveyQuestion } from "@/lib/types";

const TOTAL = 10;
const LABELS = ["A", "B", "C", "D"];

function cid() { return Math.random().toString(36).slice(2, 10); }

function emptyQuizQ(): QuizQuestion {
  return { id: cid(), question: "", options: ["", "", "", ""], correct_answer: "", points: 1 };
}

function emptySurveyQ(): SurveyQuestion {
  return { id: cid(), question: "", type: "multiple_choice", options: ["", "", "", ""] };
}

type Mode = "quiz" | "survey";

interface Props {
  mode: Mode;
  initialEventId: string;
  events: { id: string; title: string; speaker: string; category: string }[];
  speakers: string[];
  initialQuiz: Quiz | null;
  initialSurvey: Survey | null;
}

export default function QuickQuestionEditor({
  mode,
  initialEventId,
  events,
  speakers,
  initialQuiz,
  initialSurvey,
}: Props) {
  const router = useRouter();
  const [speakerFilter, setSpeakerFilter] = useState("");
  const [eventId, setEventId] = useState(initialEventId || events[0]?.id || "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(
    mode === "quiz" ? (initialQuiz?.is_active ?? false) : (initialSurvey?.is_active ?? false)
  );
  const [passingScore, setPassingScore] = useState(initialQuiz?.passing_score ?? 70);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() =>
    Array.from({ length: TOTAL }, (_, i) => initialQuiz?.questions[i] ?? emptyQuizQ())
  );
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>(() =>
    Array.from({ length: TOTAL }, (_, i) => initialSurvey?.questions[i] ?? emptySurveyQ())
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const filteredEvents = useMemo(() => {
    if (!speakerFilter) return events;
    return events.filter((e) => e.speaker === speakerFilter);
  }, [events, speakerFilter]);

  useEffect(() => {
    if (!eventId && filteredEvents[0]) setEventId(filteredEvents[0].id);
  }, [filteredEvents, eventId]);

  useEffect(() => {
    if (mode !== "quiz" || !eventId) return;
    setLoading(true);
    fetch(`/api/quiz/${eventId}`)
      .then((r) => r.json())
      .then((data: Quiz | null) => {
        setIsActive(data?.is_active ?? false);
        setPassingScore(data?.passing_score ?? 70);
        setQuizQuestions(
          Array.from({ length: TOTAL }, (_, i) => {
            const q = data?.questions[i];
            if (!q) return emptyQuizQ();
            const opts = [...q.options];
            while (opts.length < 4) opts.push("");
            return { ...q, options: opts.slice(0, 4) };
          })
        );
      })
      .finally(() => setLoading(false));
  }, [mode, eventId]);

  useEffect(() => {
    if (mode !== "survey") return;
    setLoading(true);
    fetch("/api/settings/survey")
      .then((r) => r.json())
      .then((data: Survey | null) => {
        setIsActive(data?.is_active ?? false);
        setSurveyQuestions(
          Array.from({ length: TOTAL }, (_, i) => {
            const q = data?.questions[i];
            if (!q) return emptySurveyQ();
            const opts = [...(q.options ?? [])];
            while (opts.length < 4) opts.push("");
            return { ...q, type: "multiple_choice", options: opts.slice(0, 4) };
          })
        );
      })
      .finally(() => setLoading(false));
  }, [mode]);

  function updateQuiz(id: string, field: string, value: unknown) {
    setQuizQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  }
  function updateQuizOpt(id: string, idx: number, val: string) {
    setQuizQuestions((qs) => qs.map((q) => {
      if (q.id !== id) return q;
      const opts = [...q.options]; opts[idx] = val;
      const correct = q.correct_answer === q.options[idx] ? val : q.correct_answer;
      return { ...q, options: opts, correct_answer: correct };
    }));
  }
  function updateSurvey(id: string, field: string, value: unknown) {
    setSurveyQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  }
  function updateSurveyOpt(id: string, idx: number, val: string) {
    setSurveyQuestions((qs) => qs.map((q) => {
      if (q.id !== id) return q;
      const opts = [...(q.options ?? [])]; opts[idx] = val;
      return { ...q, options: opts };
    }));
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function deleteSelected() {
    if (mode === "quiz") {
      setQuizQuestions((qs) =>
        qs.map((q) => (selected.has(q.id)
          ? emptyQuizQ()
          : q))
      );
    } else {
      setSurveyQuestions((qs) =>
        qs.map((q) => (selected.has(q.id) ? emptySurveyQ() : q))
      );
    }
    setSelected(new Set());
  }

  async function save() {
    setSaving(true); setMsg("");
    if (mode === "quiz") {
      if (!eventId) { setMsg("Select an event first."); setSaving(false); return; }
      const toSave = quizQuestions.filter((q) => q.question.trim() !== "");
      const res = await fetch(`/api/quiz/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive, passing_score: passingScore, questions: toSave }),
      });
      setSaving(false);
      if (res.ok) {
        setMsg("Quiz saved!");
        if (initialEventId) router.push(`/dashboard/eval/${eventId}`);
      } else {
        setMsg("Failed to save quiz.");
      }
    } else {
      const toSave = surveyQuestions
        .filter((q) => q.question.trim() !== "")
        .map((q) => ({ ...q, type: "multiple_choice" as const }));
      const res = await fetch("/api/settings/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive, questions: toSave }),
      });
      setSaving(false);
      if (res.ok) {
        setMsg("Survey saved! Applies to all events.");
        if (initialEventId) router.push(`/dashboard/eval/${initialEventId}`);
      } else {
        setMsg("Failed to save survey.");
      }
    }
  }

  const questions = mode === "quiz" ? quizQuestions : surveyQuestions;
  const selectedEvent = events.find((e) => e.id === eventId);

  return (
    <div className="admin-page quick-editor">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Quick Question Editor</h1>
          <p className="text-muted" style={{ maxWidth: 720 }}>
            {mode === "quiz"
              ? "Select an event, add or edit up to 10 quiz questions, mark correct answers, then save."
              : "Add or edit up to 10 survey questions (applies to all events), then save."}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {mode === "quiz" && eventId && (
            <a
              href={`/dashboard/preview/quiz/${eventId}?from=questions`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Preview Quiz
            </a>
          )}
          {mode === "survey" && (
            <a
              href="/dashboard/settings/preview/survey"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Preview Survey
            </a>
          )}
          <Link href={initialEventId ? `/dashboard/eval/${initialEventId}` : "/dashboard"} className="btn btn-secondary btn-sm">
            Back
          </Link>
        </div>
      </div>

      <div className="quick-editor-toolbar card">
        <div className="card-body quick-toolbar-grid">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Speaker (optional filter)</label>
            <select className="form-control" value={speakerFilter} onChange={(e) => setSpeakerFilter(e.target.value)}>
              <option value="">— All —</option>
              {speakers.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="form-hint">Filters the event list below.</div>
          </div>

          {mode === "quiz" && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Event (Module)</label>
              <select className="form-control" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                {filteredEvents.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
              <div className="form-hint">Existing quiz questions load when selected.</div>
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Status</label>
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", marginTop: ".35rem" }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span style={{ fontWeight: 600 }}>{isActive ? "Active" : "Inactive"}</span>
            </label>
          </div>

          {mode === "quiz" && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Passing Score (%)</label>
              <input type="number" className="form-control" min={0} max={100} value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))} />
            </div>
          )}
        </div>
      </div>

      {selectedEvent && mode === "quiz" && (
        <div className="quick-event-banner">
          Editing quiz for: <strong>{selectedEvent.title}</strong>
          {selectedEvent.speaker && <> · Speaker: {selectedEvent.speaker}</>}
        </div>
      )}

      {msg && (
        <div className={`alert alert-${!msg.toLowerCase().startsWith("failed") && !msg.toLowerCase().includes("error") ? "success" : "error"}`}>{msg}</div>
      )}

      {loading ? (
        <div className="admin-empty">Loading questions…</div>
      ) : (
        questions.map((q, idx) => {
          const qId = q.id;
          const isQuiz = mode === "quiz";
          const quizQ = isQuiz ? (q as QuizQuestion) : null;
          const surveyQ = !isQuiz ? (q as SurveyQuestion) : null;

          return (
            <div key={qId} className="card quick-q-block">
              <div className="card-body">
                <div className="quick-q-header">
                  <label className="quick-select-row">
                    <input type="checkbox" checked={selected.has(qId)} onChange={() => toggleSelect(qId)} />
                    Select (delete)
                  </label>
                  <div className="quick-sort">
                    <label className="form-label" style={{ margin: 0 }}>Sort</label>
                    <input type="number" className="form-control" style={{ width: 64 }} value={idx + 1} readOnly />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Question Text</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={q.question}
                    placeholder="Enter question text…"
                    onChange={(e) =>
                      isQuiz
                        ? updateQuiz(qId, "question", e.target.value)
                        : updateSurvey(qId, "question", e.target.value)
                    }
                  />
                </div>

                <div className="quick-options-grid">
                  {LABELS.map((label, i) => (
                    <div key={label} className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Option {label}</label>
                      <input
                        className="form-control"
                        value={isQuiz ? quizQ!.options[i] ?? "" : (surveyQ!.options ?? [])[i] ?? ""}
                        onChange={(e) =>
                          isQuiz
                            ? updateQuizOpt(qId, i, e.target.value)
                            : updateSurveyOpt(qId, i, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>

                {isQuiz && (
                  <div className="quick-q-footer">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Correct Answer</label>
                      <div className="quick-correct-row">
                        {LABELS.map((label, i) => (
                          <label key={label} className="quick-correct-opt">
                            <input
                              type="radio"
                              name={`correct_${qId}`}
                              checked={!!quizQ!.options[i]?.trim() && quizQ!.correct_answer === quizQ!.options[i]}
                              onChange={() => quizQ!.options[i]?.trim() && updateQuiz(qId, "correct_answer", quizQ!.options[i])}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Points</label>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 80 }}
                        min={1}
                        value={quizQ!.points}
                        onChange={(e) => updateQuiz(qId, "points", Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      <div className="quick-editor-actions">
        {selected.size > 0 && (
          <button type="button" className="btn btn-danger" onClick={deleteSelected}>
            Delete Selected ({selected.size})
          </button>
        )}
        <button type="button" className="btn btn-gold btn-lg" onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save Questions"}
        </button>
      </div>
    </div>
  );
}
