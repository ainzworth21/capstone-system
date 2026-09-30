import fs from "fs";
import path from "path";
import type { PreAssessment, Survey } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function filePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

/** Read a single JSON object file from /data (not an array DB). */
export function readJsonFile<T>(filename: string): T | null {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Global pre-assessment (event_id = "universal"), questions with text only. */
export function getUniversalPreAssessment(): PreAssessment | null {
  const assessments = readDB<PreAssessment>("pre_assessments");
  const universal = assessments.find((a) => a.event_id === "universal") ?? null;
  if (!universal) return null;
  const questions = (universal.questions ?? []).filter((q) => q.question.trim() !== "");
  if (questions.length === 0) return null;
  return { ...universal, questions };
}

/** Global survey that applies to every event. */
export function getUniversalSurvey(): Survey | null {
  return readJsonFile<Survey>("universal_survey.json");
}

export function readDB<T>(name: string): T[] {
  try {
    const raw = fs.readFileSync(filePath(name), "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function writeDB<T>(name: string, data: T[]): void {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf-8");
}

export function findOne<T>(name: string, predicate: (item: T) => boolean): T | null {
  return readDB<T>(name).find(predicate) ?? null;
}

export function insertOne<T>(name: string, item: T): T {
  const data = readDB<T>(name);
  data.push(item);
  writeDB(name, data);
  return item;
}

export function updateOne<T>(
  name: string,
  predicate: (item: T) => boolean,
  updater: (item: T) => T
): boolean {
  const data = readDB<T>(name);
  let found = false;
  const updated = data.map((item) => {
    if (predicate(item)) {
      found = true;
      return updater(item);
    }
    return item;
  });
  if (found) writeDB(name, updated);
  return found;
}

export function deleteOne<T>(name: string, predicate: (item: T) => boolean): boolean {
  const data = readDB<T>(name);
  const filtered = data.filter((item) => !predicate(item));
  if (filtered.length === data.length) return false;
  writeDB(name, filtered);
  return true;
}
