import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { Event } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";

// AJAX polling endpoint — returns current statuses for given IDs
export async function GET(req: NextRequest) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const events = readDB<Event>("events");
  let changed = false;

  const updated = events.map((e) => {
    const s = computeEventStatus(e);
    if (s !== e.status) { changed = true; return { ...e, status: s }; }
    return e;
  });
  if (changed) writeDB("events", updated);

  const result = updated
    .filter((e) => ids.includes(e.id))
    .map((e) => ({ id: e.id, status: e.status }));

  return NextResponse.json(result);
}
