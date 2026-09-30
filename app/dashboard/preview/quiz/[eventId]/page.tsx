import { getSessionUser } from "@/lib/session";
import { findOne } from "@/lib/db";
import { Event, Quiz } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { redirect, notFound } from "next/navigation";
import FormPreviewPanel from "@/components/admin/FormPreviewPanel";
import Link from "next/link";

export default async function QuizPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user || user.role === "student") redirect("/login");

  const { eventId } = await params;
  const sp = await searchParams;
  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) notFound();

  if (user.role === "organizer" && event.organizer_id !== user.id) {
    redirect("/dashboard");
  }

  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === eventId);
  const questions = (quiz?.questions ?? []).filter((q) => q.question.trim());
  const from = sp.from === "manage" ? "manage" : sp.from === "questions" ? "questions" : "speakers";

  const backHref =
    from === "manage"
      ? `/dashboard/events/${eventId}/manage?tab=quiz`
      : from === "questions"
        ? `/dashboard/questions?type=quiz&event_id=${eventId}`
        : `/dashboard/speakers`;

  const backLabel =
    from === "manage"
      ? "Back to Manage Event"
      : from === "questions"
        ? "Back to Edit Quiz"
        : "Back to Speakers";

  return (
    <FormPreviewPanel
      kind="quiz"
      title="Quiz Preview (Read-only)"
      subtitle={`${event.title} · ${formatDate(event.event_date)}`}
      backHref={backHref}
      backLabel={backLabel}
      quizQuestions={questions}
      meta={{
        isActive: quiz?.is_active,
        passingScore: quiz?.passing_score,
      }}
      extraActions={
        from !== "speakers" ? (
          <Link
            href={`/dashboard/preview/quiz/${eventId}?from=speakers`}
            className="btn btn-secondary btn-sm"
          >
            Speakers view
          </Link>
        ) : undefined
      }
    />
  );
}
