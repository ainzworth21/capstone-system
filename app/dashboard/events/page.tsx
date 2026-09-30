import { getSessionUser } from "@/lib/session";
import { readDB, writeDB, getUniversalSurvey } from "@/lib/db";
import { Bridge, Event, Participant, Quiz } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import { speakersTableLabel } from "@/lib/speaker-ids";
import { redirect } from "next/navigation";
import EventsManager, { ManagedEventRow } from "./EventsManager";
import EventQuickEditForm from "./EventQuickEditForm";
import { getMainEvents } from "@/lib/bridge";

export default async function ManageEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "organizer") redirect("/speaker/hosted");

  const sp = await searchParams;
  const categoryFilter = sp.category ?? "";
  const typeFilter = sp.type ?? "";
  const search = sp.search ?? "";
  const editId = sp.edit ?? "";

  let allEvents = readDB<Event>("events");
  let changed = false;
  allEvents = allEvents.map((e) => {
    const s = computeEventStatus(e);
    if (s !== e.status) { changed = true; return { ...e, status: s }; }
    return e;
  });
  if (changed) writeDB("events", allEvents);

  allEvents = getMainEvents(allEvents, readDB<Bridge>("bridges"));

  if (user.role === "organizer") {
    allEvents = allEvents.filter((e) => e.organizer_id === user.id);
  }

  let filtered = [...allEvents];
  if (categoryFilter) filtered = filtered.filter((e) => e.category === categoryFilter);
  if (typeFilter === "webinar" || typeFilter === "seminar") {
    filtered = filtered.filter((e) => e.event_type === typeFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.speaker ?? "").toLowerCase().includes(q)
    );
  }

  filtered = filtered.sort((a, b) => {
    const da = `${a.event_date}T${a.start_time}`;
    const db = `${b.event_date}T${b.start_time}`;
    return db.localeCompare(da);
  });

  const participants = readDB<Participant>("participants");
  const quizzes = readDB<Quiz>("quizzes");
  const surveyActive = !!getUniversalSurvey()?.is_active;

  const allIds = [...allEvents]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => e.id);
  const idMap = new Map(allIds.map((id, i) => [id, i + 1]));

  const rows: ManagedEventRow[] = filtered.map((e) => {
    const quiz = quizzes.find((q) => q.event_id === e.id);
    return {
      id: e.id,
      shortId: idMap.get(e.id) ?? 0,
      title: e.title,
      description: e.description ?? "",
      speaker: speakersTableLabel(e),
      category: e.category || "General",
      event_type: e.event_type,
      event_date: e.event_date,
      start_time: e.start_time,
      end_time: e.end_time,
      status: e.status,
      platform_link: e.platform_link ?? "",
      platform_name: e.platform_name ?? "",
      location: e.location ?? "",
      quizActive: quiz?.is_active ?? false,
      participantCount: participants.filter(
        (p) => p.event_id === e.id && p.status !== "cancelled"
      ).length,
    };
  });

  const categories = readDB<string>("categories");
  const categoryList = Array.isArray(categories) ? categories : [];
  const usedCats = [...new Set(allEvents.map((e) => e.category))];
  const allCats = [...new Set([...categoryList, ...usedCats])].filter(Boolean).sort();

  const editEvent = editId ? allEvents.find((e) => e.id === editId) ?? null : null;

  return (
    <div className="admin-page">
      {editEvent && (
        <EventQuickEditForm event={editEvent} categories={allCats.length ? allCats : ["General"]} />
      )}
      <EventsManager
        events={rows}
        categories={allCats}
        surveyActive={surveyActive}
        activeCategory={categoryFilter}
        activeType={typeFilter}
        search={search}
        isAdmin={user.role === "admin"}
        totalEventCount={allEvents.length}
      />
    </div>
  );
}
