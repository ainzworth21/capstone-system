import { insertOne, readDB, writeDB } from "@/lib/db";
import { Event } from "@/lib/types";
import { generateId, generateToken, now } from "@/lib/utils";

const DEMO_CATEGORIES = [
  "Leadership",
  "Technology",
  "Research & Innovation",
] as const;

export type SeedDemoResult =
  | {
      ok: true;
      created: number;
      categories_added: string[];
      events: { id: string; title: string; event_type: string }[];
      forced: boolean;
    }
  | { ok: false; error: string; code: "not_empty" | "no_organizer" };

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ensureCategories(): string[] {
  const existing = readDB<string>("categories");
  const list = Array.isArray(existing) ? [...existing] : [];
  const added: string[] = [];
  for (const cat of DEMO_CATEGORIES) {
    if (!list.includes(cat)) {
      list.push(cat);
      added.push(cat);
    }
  }
  if (added.length) writeDB("categories", list);
  return added;
}

/**
 * Create 3 sample webinars/seminars without wiping users.
 * Refuses when events already exist unless `force` is true.
 */
export function seedDemoEvents(opts: {
  organizerId: string;
  force?: boolean;
}): SeedDemoResult {
  const events = readDB<Event>("events");
  const force = !!opts.force;

  if (events.length > 0 && !force) {
    return {
      ok: false,
      code: "not_empty",
      error: `Catalog already has ${events.length} event(s). Confirm force to add demo events anyway.`,
    };
  }

  if (!opts.organizerId) {
    return {
      ok: false,
      code: "no_organizer",
      error: "No organizer id provided.",
    };
  }

  const categories_added = ensureCategories();

  const templates: Omit<
    Event,
    "id" | "registration_token" | "created_at" | "status" | "organizer_id"
  >[] = [
    {
      title: "Demo Webinar: Campus Digital Literacy",
      description:
        "Sample online session on digital tools for CvSU students and staff. Created by Load demo events.",
      event_type: "webinar",
      location: "",
      platform_link: "https://meet.google.com/demo-cvsu-literacy",
      platform_name: "Google Meet",
      speaker: "Demo Resource Speaker",
      speaker_id: null,
      speaker_ids: [],
      event_date: addDays(14),
      start_time: "09:00",
      end_time: "11:00",
      capacity: 100,
      banner_image: null,
      category: "Technology",
    },
    {
      title: "Demo Seminar: Student Leadership Forum",
      description:
        "In-person sample seminar on leadership and campus engagement. Safe to delete after your demo.",
      event_type: "seminar",
      location: "CvSU Main Campus · Hermogenes Hall",
      platform_link: "",
      platform_name: "",
      speaker: "Demo Resource Speaker",
      speaker_id: null,
      speaker_ids: [],
      event_date: addDays(21),
      start_time: "13:00",
      end_time: "16:00",
      capacity: 80,
      banner_image: null,
      category: "Leadership",
    },
    {
      title: "Demo Webinar: Research Writing Essentials",
      description:
        "Sample webinar covering abstracts, citations, and academic writing basics for ITEC demos.",
      event_type: "webinar",
      location: "",
      platform_link: "https://zoom.us/j/demo-cvsu-research",
      platform_name: "Zoom",
      speaker: "Demo Resource Speaker",
      speaker_id: null,
      speaker_ids: [],
      event_date: addDays(28),
      start_time: "10:00",
      end_time: "12:00",
      capacity: 120,
      banner_image: null,
      category: "Research & Innovation",
    },
  ];

  const created: Event[] = [];
  for (const t of templates) {
    const event: Event = {
      ...t,
      id: generateId(),
      status: "upcoming",
      registration_token: generateToken(),
      organizer_id: opts.organizerId,
      created_at: now(),
    };
    insertOne("events", event);
    created.push(event);
  }

  return {
    ok: true,
    created: created.length,
    categories_added,
    forced: force,
    events: created.map((e) => ({
      id: e.id,
      title: e.title,
      event_type: e.event_type,
    })),
  };
}
