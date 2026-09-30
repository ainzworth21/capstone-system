/** Pre Q1–Q5 and Post P2 (paired for Pre vs Post reporting). */
export const CVSU_LEARNING_QUESTION_TEXTS = [
  "How much do you know about this particular topic module?",
  "How interested are you in this particular topic module?",
  "How confident are you in your understanding of this particular topic module?",
  "How well have you gained the skills acquired to this particular topic module?",
  "How willing are you to apply the knowledge or practices from this particular topic module?",
] as const;

export const CVSU_LEARNING_LABELS = [
  "Knowledge",
  "Interest",
  "Confidence",
  "Skills",
  "Willingness",
] as const;

export const PRE_QUESTION_IDS = [
  "pre-q1",
  "pre-q2",
  "pre-q3",
  "pre-q4",
  "pre-q5",
] as const;

export const P2_QUESTION_IDS = [
  "p2-knowledge",
  "p2-interest",
  "p2-confidence",
  "p2-skills",
  "p2-willingness",
] as const;

export const CVSU_LEARNING_SCALE_HINT =
  "5 - Very high | 4 - High | 3 - Moderate | 2 - Low | 1 - Very low";

export const CVSU_LEARNING_RATING_LABELS: Record<number, string> = {
  5: "Very high",
  4: "High",
  3: "Moderate",
  2: "Low",
  1: "Very low",
};
