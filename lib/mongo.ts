/**
 * MongoDB Atlas connection for Phase 5 production deploys.
 * Local/lab default remains JSON files in /data (lib/db.ts).
 *
 * Set MONGODB_URI to enable Mongo-backed helpers in lib/db-mongo.ts
 * and run: npm run migrate:mongo
 */

import { MongoClient, Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

export function mongoConfigured(): boolean {
  return !!process.env.MONGODB_URI?.trim();
}

export function mongoDbName(): string {
  return process.env.MONGODB_DB?.trim() || "cvsu_events";
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri);
    globalForMongo._mongoClientPromise = client.connect();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(mongoDbName());
}

/** Collection names mirror JSON file stems under /data (without .json). */
export const MONGO_COLLECTIONS = [
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
  "speaker_login_tokens",
  "notifications",
  "audit_log",
  "login_attempts",
] as const;

export type MongoCollectionName = (typeof MONGO_COLLECTIONS)[number];
