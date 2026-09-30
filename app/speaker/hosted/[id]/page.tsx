import Link from "next/link";
import { findOne } from "@/lib/db";
import { Quiz } from "@/lib/types";
import { requireSpeakerHostedEvent } from "@/lib/hosted-event";
import QuizEditor from "@/components/events/QuizEditor";
import { formatDate, formatTime } from "@/lib/utils";

export default async function SpeakerTopicQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event: ev } = await requireSpeakerHostedEvent(id);
  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === id);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{ev.title}</h2>
          <p className="text-muted">
            {formatDate(ev.event_date)} · {formatTime(ev.start_time)}–
            {formatTime(ev.end_time)} · {ev.category || "General"}
          </p>
        </div>
        <Link href="/speaker/hosted" className="btn btn-secondary">
          My Topics
        </Link>
      </div>

      <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
        Create or edit the quiz for this assigned topic. Event details are
        managed by the secretariat.
      </div>

      <QuizEditor
        eventId={id}
        initialData={quiz ?? null}
        previewHref={`/speaker/hosted/${id}/preview-quiz`}
      />
    </div>
  );
}
