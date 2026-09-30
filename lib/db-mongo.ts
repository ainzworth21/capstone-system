/**
 * Async MongoDB store mirroring lib/db.ts collection helpers.
 * Use when MONGODB_URI is set (Vercel / production). Lab default stays sync JSON.
 */

import { Filter, Document } from "mongodb";
import { getMongoDb, MongoCollectionName } from "@/lib/mongo";

function stripMongoId<T extends Document>(doc: T): Omit<T, "_id"> {
  const { _id: _ignored, ...rest } = doc;
  return rest;
}

export async function readDBMongo<T extends Document>(
  name: MongoCollectionName
): Promise<T[]> {
  const db = await getMongoDb();
  const rows = await db.collection(name).find({}).toArray();
  return rows.map((r) => stripMongoId(r as unknown as T)) as T[];
}

export async function writeDBMongo<T extends Document>(
  name: MongoCollectionName,
  data: T[]
): Promise<void> {
  const db = await getMongoDb();
  const col = db.collection(name);
  await col.deleteMany({});
  if (data.length === 0) return;
  await col.insertMany(data.map((item) => ({ ...item })));
}

export async function findOneMongo<T extends Document>(
  name: MongoCollectionName,
  filter: Filter<Document>
): Promise<T | null> {
  const db = await getMongoDb();
  const doc = await db.collection(name).findOne(filter);
  if (!doc) return null;
  return stripMongoId(doc as unknown as T) as T;
}

export async function insertOneMongo<T extends Document>(
  name: MongoCollectionName,
  item: T
): Promise<T> {
  const db = await getMongoDb();
  await db.collection(name).insertOne({ ...item });
  return item;
}

export async function updateOneMongo<T extends Document>(
  name: MongoCollectionName,
  filter: Filter<Document>,
  updater: (item: T) => T
): Promise<boolean> {
  const existing = await findOneMongo<T>(name, filter);
  if (!existing) return false;
  const next = updater(existing);
  const db = await getMongoDb();
  // Prefer matching by id when present
  const id = (existing as { id?: string }).id;
  const q = id ? { id } : filter;
  await db.collection(name).replaceOne(q, { ...next });
  return true;
}

export async function deleteOneMongo(
  name: MongoCollectionName,
  filter: Filter<Document>
): Promise<boolean> {
  const db = await getMongoDb();
  const res = await db.collection(name).deleteOne(filter);
  return res.deletedCount > 0;
}
