import Link from "next/link";
import type { EvaluationReadiness } from "@/lib/evaluation-readiness";

export default function EvaluationNotReady({
  eventId,
  readiness,
}: {
  eventId: string;
  readiness: EvaluationReadiness;
}) {
  const { issues } = readiness;

  return (
    <div className="admin-page">
      <div className="card" style={{ maxWidth: 640, margin: "2rem auto" }}>
        <div className="card-body text-center" style={{ padding: "2.5rem" }}>
          <h2 style={{ marginBottom: ".75rem" }}>Evaluation not ready</h2>
          <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
            The evaluation for this event cannot be displayed yet. Fix the items
            below, then open View Evaluation again.
          </p>
          <ol
            style={{
              textAlign: "left",
              maxWidth: 460,
              margin: "0 auto 2rem",
              color: "var(--gray-700)",
              lineHeight: 1.8,
            }}
          >
            {issues.includes("survey_enabled_no_questions") && (
              <li>
                Make sure <strong>Enable Post Evaluation</strong> is turned on
                and the survey has at least one question in Global Settings.
              </li>
            )}
            {issues.includes("quiz_enabled_no_questions") && (
              <li>
                <strong>Quiz</strong> is enabled for this event but has no
                questions. Add at least one question or turn the quiz off in
                Manage Event.
              </li>
            )}
            {issues.includes("nothing_configured") && (
              <>
                <li>
                  Make sure <strong>Enable Post Evaluation</strong> is turned on
                  for the event when you need post-survey results.
                </li>
                <li>
                  Make sure there is a <strong>Question Set</strong> with at
                  least one question for Survey and/or Quiz.
                </li>
              </>
            )}
          </ol>
          <div
            style={{
              display: "flex",
              gap: ".75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/dashboard/evaluations" className="btn btn-secondary">
              Back to Evaluations
            </Link>
            {(issues.includes("survey_enabled_no_questions") ||
              issues.includes("nothing_configured")) && (
              <Link
                href="/dashboard/settings?tab=survey"
                className="btn btn-primary"
              >
                Global Settings — Survey
              </Link>
            )}
            {(issues.includes("quiz_enabled_no_questions") ||
              issues.includes("nothing_configured")) && (
              <Link
                href={`/dashboard/events/${eventId}/manage?tab=quiz`}
                className="btn btn-outline-gold"
              >
                Manage Event — Quiz
              </Link>
            )}
            <Link
              href={`/dashboard/questions?type=quiz&event_id=${eventId}`}
              className="btn btn-secondary btn-sm"
            >
              Edit Quiz Questions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
