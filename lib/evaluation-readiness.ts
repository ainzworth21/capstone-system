import { findOne, getUniversalPreAssessment, getUniversalSurvey } from "./db";
import { Quiz } from "./types";

export type EvaluationIssue =
  | "survey_enabled_no_questions"
  | "quiz_enabled_no_questions"
  | "nothing_configured";

export interface EvaluationReadiness {
  ready: boolean;
  issues: EvaluationIssue[];
  surveyEnabled: boolean;
  surveyHasQuestions: boolean;
  quizEnabled: boolean;
  quizHasQuestions: boolean;
  preConfigured: boolean;
}

export function getEvaluationReadiness(eventId: string): EvaluationReadiness {
  const universalSurvey = getUniversalSurvey();
  const preAssessment = getUniversalPreAssessment();
  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === eventId);

  const surveyEnabled = !!universalSurvey?.is_active;
  const quizEnabled = !!quiz?.is_active;
  const surveyHasQuestions = (universalSurvey?.questions ?? []).some(
    (q) => q.question.trim() !== ""
  );
  const quizHasQuestions = (quiz?.questions ?? []).some(
    (q) => q.question.trim() !== ""
  );
  const preConfigured = !!preAssessment;

  const issues: EvaluationIssue[] = [];

  if (surveyEnabled && !surveyHasQuestions) {
    issues.push("survey_enabled_no_questions");
  }
  if (quizEnabled && !quizHasQuestions) {
    issues.push("quiz_enabled_no_questions");
  }

  const hasViewableModule =
    preConfigured ||
    (surveyEnabled && surveyHasQuestions) ||
    (quizEnabled && quizHasQuestions);

  if (issues.length === 0 && !hasViewableModule) {
    issues.push("nothing_configured");
  }

  return {
    ready: issues.length === 0 && hasViewableModule,
    issues,
    surveyEnabled,
    surveyHasQuestions,
    quizEnabled,
    quizHasQuestions,
    preConfigured,
  };
}
