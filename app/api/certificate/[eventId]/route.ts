import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { CertificateTemplate, Event } from "@/lib/types";
import { generateId, now } from "@/lib/utils";
import { canManageEvent } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const type =
    new URL(req.url).searchParams.get("type") === "speaker"
      ? "speaker"
      : "student";
  const templates = readDB<CertificateTemplate>("certificate_templates");
  const template =
    templates.find(
      (t) =>
        t.event_id === eventId && (t.recipient_type ?? "student") === type
    ) ?? null;
  return NextResponse.json(template);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!canManageEvent(user, event)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const recipientType: "student" | "speaker" =
    body.recipient_type === "speaker" ? "speaker" : "student";

  const templates = readDB<CertificateTemplate>("certificate_templates");
  const existing = templates.findIndex(
    (t) =>
      t.event_id === eventId &&
      (t.recipient_type ?? "student") === recipientType
  );

  const record: CertificateTemplate = {
    id: existing >= 0 ? templates[existing].id : generateId(),
    event_id: eventId,
    recipient_type: recipientType,
    image_filename:
      body.image_filename ??
      (existing >= 0 ? templates[existing].image_filename : null),
    name_x: body.name_x ?? (existing >= 0 ? templates[existing].name_x : 50),
    name_y: body.name_y ?? (existing >= 0 ? templates[existing].name_y : 60),
    name_font_size:
      body.name_font_size ??
      (existing >= 0 ? templates[existing].name_font_size : 36),
    name_color:
      body.name_color ??
      (existing >= 0 ? templates[existing].name_color : "#1a5c38"),
    name_font:
      body.name_font ??
      (existing >= 0 ? templates[existing].name_font : "Georgia"),
    created_at: existing >= 0 ? templates[existing].created_at : now(),
    updated_at: now(),
  };

  if (existing >= 0) templates[existing] = record;
  else templates.push(record);
  writeDB("certificate_templates", templates);
  return NextResponse.json(record);
}
