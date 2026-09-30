import type { ReactNode } from "react";
import Link from "next/link";
import {
  AssessmentQuestion,
  QuizQuestion,
  SurveyQuestion,
} from "@/lib/types";
import { CVSU_AGREE_SCALE_HINT, CVSU_SATISFACTION_SCALE_HINT } from "@/lib/cvsu-post-survey";
import {
  CVSU_LEARNING_SCALE_HINT,
  CVSU_LEARNING_RATING_LABELS,
} from "@/lib/cvsu-learning-questions";
import { surveyPartDividerBefore } from "@/lib/cvsu-survey-parts";
import SurveyPartDivider from "@/components/SurveyPartDivider";

export type FormPreviewKind = "pre-assessment" | "survey" | "quiz";

interface FormPreviewPanelProps {
  kind: FormPreviewKind;
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  extraActions?: ReactNode;
  preQuestions?: AssessmentQuestion[];
  surveyQuestions?: SurveyQuestion[];
  quizQuestions?: QuizQuestion[];
  meta?: { isActive?: boolean; passingScore?: number };
}

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

function RatingPreview({
  labels,
}: {
  labels: Record<number, string>;
}) {
  return (
    <div className="form-preview-rating">
      {[5, 4, 3, 2, 1].map((n) => (
        <div key={n} className="form-preview-rating-item">
          <span className="form-preview-rating-num">{n}</span>
          <span className="form-preview-rating-label">{labels[n]}</span>
        </div>
      ))}
    </div>
  );
}

export default function FormPreviewPanel({
  kind,
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  extraActions,
  preQuestions = [],
  surveyQuestions = [],
  quizQuestions = [],
  meta,
}: FormPreviewPanelProps) {
  const questions =
    kind === "pre-assessment"
      ? preQuestions
      : kind === "survey"
        ? surveyQuestions
        : quizQuestions;

  const filled = questions.filter((q) => q.question.trim() !== "");

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">{title}</h1>
          {subtitle && <p className="text-muted">{subtitle}</p>}
          {kind === "survey" && meta?.isActive !== undefined && (
            <p className="text-muted" style={{ fontSize: ".8125rem", marginTop: ".35rem" }}>
              Status:{" "}
              <strong style={{ color: meta.isActive ? "var(--primary)" : "var(--gray-500)" }}>
                {meta.isActive ? "Active" : "Inactive"}
              </strong>
            </p>
          )}
          {kind === "quiz" && meta?.passingScore !== undefined && (
            <p className="text-muted" style={{ fontSize: ".8125rem", marginTop: ".35rem" }}>
              Passing score: <strong>{meta.passingScore}%</strong>
              {meta.isActive !== undefined && (
                <>
                  {" "}
                  · Quiz: <strong>{meta.isActive ? "Active" : "Inactive"}</strong>
                </>
              )}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {extraActions}
          <Link href={backHref} className="btn btn-secondary">
            {backLabel}
          </Link>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: "1.25rem" }}>
        <span>ℹ️</span>
        <span>
          Read-only preview — students see the same layout but can select answers and submit.
        </span>
      </div>

      {kind !== "quiz" &&
        (filled as (AssessmentQuestion | SurveyQuestion)[]).some(
          (q) => q.type === "rating"
        ) && (
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid var(--gold)" }}>
          <div className="card-body" style={{ fontSize: ".875rem" }}>
            <p className="text-muted" style={{ margin: 0 }}>{CVSU_AGREE_SCALE_HINT}</p>
          </div>
        </div>
      )}

      {filled.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-muted" style={{ padding: "2.5rem" }}>
            No questions configured yet. Add questions in the editor, save, then preview again.
          </div>
        </div>
      ) : kind === "quiz" ? (
        <div className="card">
          <div className="card-body">
            <ol className="quiz-preview-list">
              {(filled as QuizQuestion[]).map((q, i) => (
                <li key={q.id}>
                  <div className="quiz-preview-q">
                    Q{i + 1}. {q.question}
                    {q.points ? (
                      <span className="text-muted" style={{ fontWeight: 500, marginLeft: ".5rem" }}>
                        ({q.points} pt{q.points !== 1 ? "s" : ""})
                      </span>
                    ) : null}
                  </div>
                  <ul className="quiz-preview-opts">
                    {(q.options ?? []).filter((o) => o.trim()).map((opt, oi) => {
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
          </div>
        </div>
      ) : (
        filled.map((q, idx) => {
          const sq = q as SurveyQuestion | AssessmentQuestion;
          const prev = filled[idx - 1] as SurveyQuestion | AssessmentQuestion | undefined;
          const partLabel =
            kind === "survey" ? surveyPartDividerBefore(sq.id, prev?.id) : null;
          const satisfaction = sq.id === "p1-satisfaction";
          const learning = sq.id.startsWith("pre-q") || sq.id.startsWith("p2-");
          return (
            <div key={sq.id}>
              {partLabel && <SurveyPartDivider label={partLabel} />}
              <div className="card" style={{ marginBottom: "1rem" }}>
              <div className="card-body">
                <div style={{ fontWeight: 700, marginBottom: ".75rem" }}>
                  {idx + 1}. {sq.question}
                </div>
                {sq.type === "rating" ? (
                  <>
                    {satisfaction && (
                      <p className="text-muted" style={{ fontSize: ".78rem", marginBottom: ".75rem" }}>
                        {CVSU_SATISFACTION_SCALE_HINT}
                      </p>
                    )}
                    {learning && !satisfaction && (
                      <p className="text-muted" style={{ fontSize: ".78rem", marginBottom: ".75rem" }}>
                        {CVSU_LEARNING_SCALE_HINT}
                      </p>
                    )}
                    <RatingPreview
                      labels={
                        satisfaction
                          ? SATISFACTION_LABELS
                          : learning
                            ? CVSU_LEARNING_RATING_LABELS
                            : AGREE_LABELS
                      }
                    />
                  </>
                ) : sq.type === "multiple_choice" && sq.options ? (
                  <ul className="quiz-preview-opts">
                    {sq.options.filter((o) => o.trim()).map((opt, oi) => (
                      <li key={oi}>({oi + 1}) {opt}</li>
                    ))}
                  </ul>
                ) : (
                  <div
                    className="form-control"
                    style={{
                      minHeight: 72,
                      background: "var(--gray-50)",
                      color: "var(--gray-500)",
                      fontSize: ".875rem",
                    }}
                  >
                    Short answer text field
                  </div>
                )}
              </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
