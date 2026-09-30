import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { seedDemoEvents } from "@/lib/seed-demo";
import { readDB } from "@/lib/db";
import { Event } from "@/lib/types";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = readDB<Event>("events").length;
  return NextResponse.json({
    event_count: count,
    empty: count === 0,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const force = !!(body as { force?: boolean }).force;

  const result = seedDemoEvents({
    organizerId: user.id,
    force,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.code === "not_empty" ? 409 : 400 }
    );
  }

  return NextResponse.json({
    success: true,
    ...result,
    message: `Added ${result.created} demo event(s).`,
  });
}
