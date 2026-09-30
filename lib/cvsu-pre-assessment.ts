import { AssessmentQuestion } from "./types";
import { CVSU_AGREE_SCALE_HINT } from "./cvsu-post-survey";
import {
  CVSU_LEARNING_QUESTION_TEXTS,
  PRE_QUESTION_IDS,
} from "./cvsu-learning-questions";

export const CVSU_PRE_SLOT_COUNT = 5;

export { CVSU_AGREE_SCALE_HINT };

/** Five Likert learning questions (Pre Q1–Q5 in Reporting). */
export function cvsuPreAssessmentTemplate(): AssessmentQuestion[] {
  return PRE_QUESTION_IDS.map((id, i) => ({
    id,
    question: CVSU_LEARNING_QUESTION_TEXTS[i],
    type: "rating" as const,
    options: ["5", "4", "3", "2", "1"],
  }));
}

export function isCvsuPreAssessment(questions: AssessmentQuestion[]) {
  return questions.some((q) => /^pre-q\d+$/.test(q.id));
}
