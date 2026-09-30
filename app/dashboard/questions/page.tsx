import { getSessionUser } from "@/lib/session";
import { readDB, getUniversalSurvey } from "@/lib/db";
import { Bridge, Event, Quiz } from "@/lib/types";
import { redirect } from "next/navigation";
import QuickQuestionEditor from "./QuickQuestionEditor";
import { redirectSpeakerToPortal } from "@/lib/speaker-portal";
import { getMainEvents } from "@/lib/bridge";

export default async function QuickQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirectSpeakerToPortal(user);
  const sp = await searchParams;
  const type = sp.type === "quiz" ? "quiz" : "survey";
  const eventId = sp.event_id ?? "";

  const storedEvents = readDB<Event>("events");
  let allEvents = getMainEvents(storedEvents, readDB<Bridge>("bridges"));
  const explicitBridgeEvent = eventId
    ? storedEvents.find((event) => event.id === eventId && !allEvents.some((mainEvent) => mainEvent.id === event.id))
    : undefined;
  if (explicitBridgeEvent) allEvents = [explicitBridgeEvent];
  if (user.role === "organizer") {
    allEvents = allEvents.filter((e) => e.organizer_id === user.id);
  }

  const events = allEvents
    .map((e) => ({
      id: e.id,
      title: e.title,
      speaker: e.speaker ?? "",
      category: e.category ?? "General",
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const speakers = [...new Set(events.map((e) => e.speaker).filter(Boolean))].sort();

  const initialQuiz = eventId
    ? readDB<Quiz>("quizzes").find((q) => q.event_id === eventId) ?? null
    : null;
  const initialSurvey = getUniversalSurvey();

  return (
    <QuickQuestionEditor
      mode={type}
      initialEventId={eventId}
      events={events}
      speakers={speakers}
      initialQuiz={initialQuiz}
      initialSurvey={initialSurvey}
    />
  );
}
