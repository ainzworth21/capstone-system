import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildStarReport, starEventCsv } from "@/lib/star-report";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const eventId = sp.get("event_id");
  if (!eventId) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  const report = buildStarReport({
    bridge_id: sp.get("bridge_id") ?? undefined,
    event_id: eventId,
    organizer_id: user.role === "organizer" ? user.id : undefined,
  });
  const event = report.events[0];
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const csv = starEventCsv(event);
  const filename = `star_report_${event.title.replace(/\s+/g, "_")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
