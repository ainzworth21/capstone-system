/**
 * CLI seed: add 3 demo events without wiping users.
 * Usage:
 *   npm run seed:demo
 *   npm run seed:demo -- --force
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");

const force = process.argv.includes("--force");

function readJson(name, fallback) {
  const p = path.join(DATA, name);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(data, null, 2), "utf-8");
}

function token() {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const events = readJson("events.json", []);
if (events.length > 0 && !force) {
  console.error(
    `events.json already has ${events.length} event(s). Re-run with --force to add demo events anyway.`
  );
  process.exit(1);
}

const users = readJson("users.json", []);
const admin = users.find((u) => u.role === "admin") || users[0];
if (!admin) {
  console.error("No users found — create an admin account first.");
  process.exit(1);
}

let categories = readJson("categories.json", []);
if (!Array.isArray(categories)) categories = [];
const demoCats = ["Leadership", "Technology", "Research & Innovation"];
for (const c of demoCats) {
  if (!categories.includes(c)) categories.push(c);
}
writeJson("categories.json", categories);

const templates = [
  {
    title: "Demo Webinar: Campus Digital Literacy",
    description:
      "Sample online session on digital tools for CvSU students and staff. Created by seed:demo.",
    event_type: "webinar",
    location: "",
    platform_link: "https://meet.google.com/demo-cvsu-literacy",
    platform_name: "Google Meet",
    event_date: addDays(14),
    start_time: "09:00",
    end_time: "11:00",
    capacity: 100,
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
    event_date: addDays(21),
    start_time: "13:00",
    end_time: "16:00",
    capacity: 80,
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
    event_date: addDays(28),
    start_time: "10:00",
    end_time: "12:00",
    capacity: 120,
    category: "Research & Innovation",
  },
];

const created = [];
for (const t of templates) {
  const event = {
    id: randomUUID(),
    ...t,
    speaker: "Demo Resource Speaker",
    speaker_id: null,
    banner_image: null,
    status: "upcoming",
    registration_token: token(),
    organizer_id: admin.id,
    created_at: new Date().toISOString(),
  };
  events.push(event);
  created.push(event.title);
}

writeJson("events.json", events);
console.log(`Added ${created.length} demo event(s) as organizer ${admin.email}:`);
for (const title of created) console.log(`  - ${title}`);
if (force) console.log("(forced — existing events were kept)");
