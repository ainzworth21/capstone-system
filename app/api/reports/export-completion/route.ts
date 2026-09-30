import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildCompletionRows } from "@/lib/completion";
import { formatCompletedAt } from "@/lib/registration-fields";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const { rows } = buildCompletionRows({
    bridge_id: sp.get("bridge_id") ?? undefined,
    status: sp.get("status") ?? "completed",
    topic: sp.get("topic") ?? undefined,
    event_id: sp.get("event_id") ?? undefined,
    designation: sp.get("designation") ?? undefined,
    organization: sp.get("organization") ?? undefined,
    country: sp.get("country") ?? undefined,
    program: sp.get("program") ?? undefined,
    institution: sp.get("institution") ?? undefined,
    q: sp.get("q") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    limit: sp.get("limit") ?? "5000",
    organizer_id: user.role === "organizer" ? user.id : undefined,
  });

  const headers = [
    "Module",
    "Webinar/Seminar",
    "Name",
    "Email",
    "Age",
    "Country",
    "Designation",
    "Organization",
    "Program",
    "Institution",
    "Staff ID",
    "Completed At",
  ];

  const csvRows = rows.map((r) => [
    r.topic,
    r.eventTitle,
    r.name,
    r.email,
    r.age != null ? String(r.age) : "",
    r.country,
    r.designation,
    r.organization,
    r.program,
    r.institution,
    r.staffId,
    formatCompletedAt(r.completedAt ?? r.registeredAt),
  ]);

  const csv = [headers, ...csvRows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        `attachment; filename="${sp.get("bridge_id") ? "bridge_completed_registrations" : "completed_registrations"}.csv"`,
    },
  });
}
