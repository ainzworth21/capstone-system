import { SurveyQuestion } from "./types";
import {
  CVSU_LEARNING_QUESTION_TEXTS,
  CVSU_LEARNING_SCALE_HINT,
  P2_QUESTION_IDS,
} from "./cvsu-learning-questions";

/** Likert scale used for procedure, speaker, and overall evaluation items */
export const CVSU_AGREE_SCALE_HINT =
  "5 - Strongly Agree | 4 - Agree | 3 - Neutral | 2 - Disagree | 1 - Strongly Disagree";

export const CVSU_SATISFACTION_SCALE_HINT =
  "5 - Greatly exceeded expectations | 4 - Exceeded expectations | 3 - Met expectations | 2 - Less than expected | 1 - Much less than expected";

const RATING_OPTS = ["5", "4", "3", "2", "1"];

function rating(
  id: string,
  question: string,
  options = RATING_OPTS
): SurveyQuestion {
  return { id, question, type: "rating", options };
}

function text(id: string, question: string): SurveyQuestion {
  return { id, question, type: "short_answer" };
}

/** CvSU Post Evaluation Survey — P1 evaluation, feedback, then P2 learning (paired with pre). */
export const CVSU_POST_SURVEY_QUESTIONS: SurveyQuestion[] = [
  // Procedure and Content (maps to P1 columns 1–7)
  rating(
    "p1-objectives",
    "The objectives of the activity were clearly defined and successfully achieved"
  ),
  rating(
    "p1-topic",
    "Appropriateness of the topic/s to attain the objective"
  ),
  rating("p1-method", "Appropriateness of the teaching method/s used"),
  rating(
    "p1-info",
    "The information that was presented proved to be valuable"
  ),
  rating(
    "p1-time",
    "The activity was conducted at an appropriate time and was highly relevant"
  ),
  rating(
    "p1-usefulness",
    "Usefulness of the topic/s discussed in the activity"
  ),
  rating("p1-expectations", "The activity met my expectations"),
  // Keynote Speaker (P1 columns 8–10)
  rating(
    "p1-clarity",
    "The speaker delivered the topic clearly and in an organized manner"
  ),
  rating(
    "p1-accommodating",
    "The speaker was highly accommodating in addressing questions and reactions"
  ),
  rating(
    "p1-mastery",
    "The speaker demonstrated sufficient knowledge of the assigned topic being discussed"
  ),
  // Overall Evaluation (P1 columns 11–13)
  rating("p1-relevance", "Relevance"),
  rating("p1-quality", "Quality"),
  rating("p1-timeliness", "Timeliness"),
  // Overall Satisfaction (P1 column 14)
  rating("p1-satisfaction", "Overall satisfaction with the activity"),
  // Open feedback
  text("p1-comments", "Comments"),
  text("p1-recommendations", "Recommendations"),
  // Pre vs Post Learning (P2 Q1–Q5 — same wording as pre-assessment)
  ...P2_QUESTION_IDS.map((id, i) =>
    rating(id, CVSU_LEARNING_QUESTION_TEXTS[i])
  ),
];

export const CVSU_SURVEY_SECTIONS: {
  start: number;
  title: string;
  hint?: string;
}[] = [
  { start: 0, title: "Procedure and Content", hint: CVSU_AGREE_SCALE_HINT },
  { start: 7, title: "Keynote Speaker", hint: CVSU_AGREE_SCALE_HINT },
  { start: 10, title: "Overall Evaluation", hint: CVSU_AGREE_SCALE_HINT },
  {
    start: 13,
    title: "Overall Satisfaction",
    hint: CVSU_SATISFACTION_SCALE_HINT,
  },
  { start: 14, title: "Feedback" },
  {
    start: 16,
    title: "Pre vs Post Learning (Likert Q1–Q5)",
    hint: CVSU_LEARNING_SCALE_HINT,
  },
];

export const CVSU_SURVEY_SLOT_COUNT = CVSU_POST_SURVEY_QUESTIONS.length;
