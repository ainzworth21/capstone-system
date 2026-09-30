import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  buildSurveyResultReport,
  surveyResultCsvHeaders,
  surveyResultToCsvRow,
} from "@/lib/reporting";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const requireCert = sp.get("all") !== "1";
  const inboundOnly = sp.get("inbound") === "1";

  const report = buildSurveyResultReport({
    topic: sp.get("topic") ?? undefined,
    event_id: sp.get("event_id") ?? undefined,
    bridge_id: sp.get("bridge_id") ?? undefined,
    organizer_id: user.role === "organizer" ? user.id : undefined,
    require_cert: inboundOnly ? false : requireCert,
  });
  let rows = report.rows;
  const { meta } = report;

  if (inboundOnly) {
    rows = rows.filter((r) => {
      const inst = r.institution.toLowerCase();
      const org = r.organization.toLowerCase();
      return (
        inst.includes("cvsu") ||
        org.includes("cvsu") ||
        org.includes("cavite state")
      );
    });
  }

  const headers = surveyResultCsvHeaders(meta);
  const csvRows = rows.map((r) => surveyResultToCsvRow(r, meta));

  const csv = [headers, ...csvRows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="survey_results_per_participant.csv"',
    },
  });
}
