import { NextRequest, NextResponse } from "next/server";
import { readDB, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Participant, Event } from "@/lib/types";
import { canManageEvent } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = new URL(req.url).searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!canManageEvent(user, event)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const participants = readDB<Participant>("participants").filter((p) => p.event_id === eventId);

  const headers = [
    "Module","Webinar/Seminar","Name","Email","Age","Country","Designation",
    "Organization","Program","Institution","Staff ID","Completed At",
    "Status","Registered At",
  ];
  const rows = participants.map((p) => [
    event?.category ?? "",
    event?.title ?? "",
    p.full_name,
    p.email,
    p.age ?? "",
    p.country ?? "",
    p.designation ?? "",
    p.organization ?? "",
    p.course,
    p.institution ?? "",
    p.student_id,
    p.status === "attended" ? new Date(p.registered_at).toISOString().replace("T"," ").slice(0,19) : "",
    p.status,
    new Date(p.registered_at).toLocaleString(),
  ]);

  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const filename = `participants_${event?.title.replace(/\s+/g,"_") ?? eventId}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
