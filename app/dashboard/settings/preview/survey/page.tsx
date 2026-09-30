import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getUniversalSurvey } from "@/lib/db";
import FormPreviewPanel from "@/components/admin/FormPreviewPanel";

export default async function SurveyPreviewPage() {
  const user = await getSessionUser();
  if (!user || user.role === "student") redirect("/login");

  const survey = getUniversalSurvey();
  const questions = (survey?.questions ?? []).filter((q) => q.question.trim());

  return (
    <FormPreviewPanel
      kind="survey"
      title="Post-Evaluation Survey Preview"
      subtitle="Shown to attended students · P1 evaluation, feedback, and P2 learning (Q1–Q5)"
      backHref="/dashboard/settings?tab=survey"
      backLabel="Edit Survey"
      surveyQuestions={questions}
      meta={{ isActive: survey?.is_active }}
    />
  );
}
