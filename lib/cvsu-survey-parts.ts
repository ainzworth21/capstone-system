/** Major survey parts (UiTM-style Post Evaluation 1 / 2). */
export const CVSU_SURVEY_PARTS = [
  { start: 0, label: "Post Evaluation 1" },
  { start: 16, label: "Post Evaluation 2" },
] as const;

export function surveyPartDividerAt(index: number): string | null {
  return CVSU_SURVEY_PARTS.find((p) => p.start === index)?.label ?? null;
}

export function surveyPartDividerBefore(
  questionId: string,
  previousQuestionId?: string
): string | null {
  if (questionId.startsWith("p2-") && !previousQuestionId?.startsWith("p2-")) {
    return "Post Evaluation 2";
  }
  if (questionId.startsWith("p1-") && !previousQuestionId?.startsWith("p1-")) {
    return "Post Evaluation 1";
  }
  return null;
}
