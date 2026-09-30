import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSpeakers } from "@/lib/speakers";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const speakers = getSpeakers();
  const headers = [
    "Full Name",
    "Title / Position",
    "Affiliation",
    "Email",
    "Active",
    "Account Status",
    "Event",
    "Event Type",
    "Module",
    "Date",
    "Quiz Set",
    "Question Count",
  ];

  const rows: string[][] = [];
  for (const s of speakers) {
    if (s.events.length === 0) {
      rows.push([
        s.full_name,
        s.title_position,
        s.affiliation,
        s.email,
        s.speaker_active ? "Yes" : "No",
        s.account_status,
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      continue;
    }
    for (const ev of s.events) {
      rows.push([
        s.full_name,
        s.title_position,
        s.affiliation,
        s.email,
        s.speaker_active ? "Yes" : "No",
        s.account_status,
        ev.title,
        ev.event_type,
        ev.category,
        ev.event_date_label,
        ev.quizSet ? "Yes" : "No",
        String(ev.questionCount),
      ]);
    }
  }

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="speakers_events.csv"',
    },
  });
}
