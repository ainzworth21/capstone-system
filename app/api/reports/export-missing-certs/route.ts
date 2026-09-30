import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildMissingCertificateRows, missingCertCsv } from "@/lib/missing-certificates";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  let { rows } = buildMissingCertificateRows(
    user.role === "organizer" ? user.id : undefined
  );

  const topic = sp.get("topic");
  const eventId = sp.get("event_id");
  if (topic) rows = rows.filter((r) => r.topic === topic);
  if (eventId) rows = rows.filter((r) => r.eventId === eventId);

  return new NextResponse(missingCertCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="missing_certificates.csv"',
    },
  });
}
