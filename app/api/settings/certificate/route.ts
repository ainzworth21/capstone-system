import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import fs from "fs";
import path from "path";
import { generateId, now } from "@/lib/utils";

const STUDENT_FILE = path.join(process.cwd(), "data", "universal_certificate.json");
const SPEAKER_FILE = path.join(
  process.cwd(),
  "data",
  "universal_speaker_certificate.json"
);

function fileFor(recipientType: "student" | "speaker") {
  return recipientType === "speaker" ? SPEAKER_FILE : STUDENT_FILE;
}

function read(recipientType: "student" | "speaker") {
  try {
    return JSON.parse(fs.readFileSync(fileFor(recipientType), "utf-8"));
  } catch {
    return null;
  }
}

function write(recipientType: "student" | "speaker", data: unknown) {
  fs.writeFileSync(fileFor(recipientType), JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  const type =
    req.nextUrl.searchParams.get("recipient_type") === "speaker"
      ? "speaker"
      : "student";
  return NextResponse.json(read(type));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const recipientType: "student" | "speaker" =
    body.recipient_type === "speaker" ? "speaker" : "student";

  const current = read(recipientType) ?? {
    id: generateId(),
    event_id: "universal",
    created_at: now(),
  };

  const {
    recipient_type: _rt,
    ...rest
  } = body;

  const updated = {
    ...current,
    ...rest,
    event_id: "universal",
    recipient_type: recipientType,
    updated_at: now(),
  };
  write(recipientType, updated);
  return NextResponse.json(updated);
}
