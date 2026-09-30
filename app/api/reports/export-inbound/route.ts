import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildInboundCvsuReport, inboundCvsuCsv } from "@/lib/inbound-cvsu";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const report = buildInboundCvsuReport({
    bridge_id: sp.get("bridge_id") ?? undefined,
    topic: sp.get("topic") ?? undefined,
    event_id: sp.get("event_id") ?? undefined,
    organizer_id: user.role === "organizer" ? user.id : undefined,
    q: sp.get("q") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    attended: sp.get("attended") ?? undefined,
  });

  return new NextResponse(inboundCvsuCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inbound_cvsu_students.csv"',
    },
  });
}
