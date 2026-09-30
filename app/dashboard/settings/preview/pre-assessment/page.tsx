import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getUniversalPreAssessment } from "@/lib/db";
import FormPreviewPanel from "@/components/admin/FormPreviewPanel";

export default async function PreAssessmentPreviewPage() {
  const user = await getSessionUser();
  if (!user || user.role === "student") redirect("/login");

  const assessment = getUniversalPreAssessment();
  const questions = assessment?.questions ?? [];

  return (
    <FormPreviewPanel
      kind="pre-assessment"
      title="Pre-Assessment Preview"
      subtitle="Shown to students right after registration · maps to Pre Q1–Q5 in Reporting"
      backHref="/dashboard/settings?tab=pre-assessment"
      backLabel="Edit Pre-Assessment"
      preQuestions={questions}
    />
  );
}
