import { findOne } from "@/lib/db";
import { Quiz } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import FormPreviewPanel from "@/components/admin/FormPreviewPanel";
import { requireSpeakerHostedEvent } from "@/lib/hosted-event";

export default async function SpeakerQuizPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event } = await requireSpeakerHostedEvent(id);
  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === id);
  const questions = (quiz?.questions ?? []).filter((q) => q.question.trim());

  return (
    <FormPreviewPanel
      kind="quiz"
      title="Quiz Preview (Read-only)"
      subtitle={`${event.title} · ${formatDate(event.event_date)}`}
      backHref={`/speaker/hosted/${id}?tab=quiz`}
      backLabel="Back to Quiz"
      quizQuestions={questions}
      meta={{
        isActive: quiz?.is_active,
        passingScore: quiz?.passing_score,
      }}
    />
  );
}
