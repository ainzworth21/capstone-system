/**
 * Migrate /data/*.json arrays into MongoDB Atlas collections.
 *
 * Usage:
 *   set MONGODB_URI=mongodb+srv://...
 *   set MONGODB_DB=cvsu_events   (optional)
 *   npm run migrate:mongo
 *
 * Also migrates single-object JSON files into a `settings` collection.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");

const COLLECTIONS = [
  "users",
  "events",
  "participants",
  "categories",
  "attendance_logs",
  "feedback",
  "quizzes",
  "quiz_attempts",
  "surveys",
  "survey_responses",
  "pre_assessments",
  "assessment_responses",
  "certificate_templates",
  "issued_certificates",
  "issued_speaker_certificates",
  "pubmats",
  "password_resets",
  "notifications",
  "audit_log",
];

const SETTINGS_FILES = [
  "universal_certificate.json",
  "universal_speaker_certificate.json",
  "universal_survey.json",
  "login_attempts.json",
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

async function main() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.error("Set MONGODB_URI before running migrate:mongo");
    process.exit(1);
  }
  const dbName = process.env.MONGODB_DB?.trim() || "cvsu_events";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log(`Migrating into ${dbName}…`);

  for (const name of COLLECTIONS) {
    const raw = readJson(path.join(DATA, `${name}.json`));
    const rows = Array.isArray(raw) ? raw : [];
    const col = db.collection(name);
    await col.deleteMany({});
    if (rows.length) {
      await col.insertMany(rows.map((r) => ({ ...r })));
    }
    console.log(`  ${name}: ${rows.length} document(s)`);
  }

  const settings = db.collection("settings");
  for (const file of SETTINGS_FILES) {
    const key = file.replace(/\.json$/, "");
    const value = readJson(path.join(DATA, file));
    if (value === null) continue;
    await settings.updateOne(
      { _key: key },
      { $set: { _key: key, value } },
      { upsert: true }
    );
    console.log(`  settings/${key}: ok`);
  }

  await client.close();
  console.log("Migration complete.");
  console.log("Next: set MONGODB_URI (+ optional MONGODB_DB) on Vercel and switch routes to lib/db-mongo.ts helpers.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
