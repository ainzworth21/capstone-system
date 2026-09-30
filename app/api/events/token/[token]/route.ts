import { NextRequest, NextResponse } from "next/server";
import { findOne } from "@/lib/db";
import { Event } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const event = findOne<Event>("events", (e) => e.registration_token === token);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ ...event, status: computeEventStatus(event) });
}
