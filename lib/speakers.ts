import { readDB } from "./db";
import { Event, Quiz, User } from "./types";
import { formatDate } from "./utils";
import { isEventHost } from "./authz";

export interface SpeakerEventRow {
  id: string;
  title: string;
  event_date: string;
  event_date_label: string;
  event_type: string;
  category: string;
  quizSet: boolean;
  questionCount: number;
  quizActive: boolean;
}

export interface SpeakerRow {
  id: string;
  full_name: string;
  email: string;
  title_position: string;
  affiliation: string;
  bio: string;
  speaker_active: boolean;
  account_status: string;
  id_image: string | null;
  events: SpeakerEventRow[];
  quizSetsDone: number;
  quizSetsTotal: number;
}

function normalizeSpeaker(u: User) {
  return {
    title_position: u.title_position ?? "",
    affiliation: u.affiliation ?? "",
    bio: u.bio ?? "",
    speaker_active: u.speaker_active ?? u.account_status === "approved",
    id_image: u.id_image ?? null,
  };
}

export function getSpeakers(): SpeakerRow[] {
  const users = readDB<User>("users").filter((u) => u.role === "organizer");
  const events = readDB<Event>("events");
  const quizzes = readDB<Quiz>("quizzes");

  return users
    .map((u) => {
      const profile = normalizeSpeaker(u);
      const myEvents = events
        .filter((e) => isEventHost(e, u.id))
        .sort((a, b) => b.event_date.localeCompare(a.event_date))
        .map((e) => {
          const quiz = quizzes.find((q) => q.event_id === e.id);
          const questionCount = (quiz?.questions ?? []).filter((q) =>
            q.question.trim()
          ).length;
          return {
            id: e.id,
            title: e.title,
            event_date: e.event_date,
            event_date_label: formatDate(e.event_date),
            event_type: e.event_type,
            category: e.category || "General",
            quizSet: questionCount > 0,
            questionCount,
            quizActive: !!quiz?.is_active,
          };
        });

      const quizSetsDone = myEvents.filter((e) => e.quizSet).length;

      return {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        title_position: profile.title_position,
        affiliation: profile.affiliation,
        bio: profile.bio,
        speaker_active: profile.speaker_active,
        account_status: u.account_status,
        id_image: profile.id_image,
        events: myEvents,
        quizSetsDone,
        quizSetsTotal: myEvents.length,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}
