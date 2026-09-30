import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  buildSurveySummaryReport,
  summaryGroupCsvHeaders,
  summaryGroupToCsvRow,
} from "@/lib/summary-report";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const mode = sp.get("mode") === "topic" ? "topic" : "webinar";

  const filters = {
    bridge_id: sp.get("bridge_id") ?? undefined,
    topic: sp.get("topic") ?? undefined,
    event_id: sp.get("event_id") ?? undefined,
    start_date: sp.get("start_date") ?? undefined,
    end_date: sp.get("end_date") ?? undefined,
    organizer_id: user.role === "organizer" ? user.id : undefined,
    require_cert: false,
  };

  const report = buildSurveySummaryReport(filters);
  const groups = mode === "topic" ? report.byTopic : report.byWebinar;
  const headers = summaryGroupCsvHeaders();
  const csvRows = groups.map((g) => summaryGroupToCsvRow(g, mode));

  const csv = [headers, ...csvRows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const filename =
    mode === "topic"
      ? "summary_by_topic.csv"
      : "summary_by_webinar_seminar.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
