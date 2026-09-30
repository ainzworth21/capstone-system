import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { generateId, now } from "@/lib/utils";
import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "data", "universal_survey.json");

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { return null; }
}
function write(data: any) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const current = read() ?? { id: generateId(), event_id: "universal", created_at: now() };
  const updated = {
    ...current,
    is_active: body.is_active ?? current.is_active,
    questions: (body.questions ?? current.questions ?? []).filter(
      (q: { question?: string }) => (q.question ?? "").trim() !== ""
    ),
  };
  write(updated);
  return NextResponse.json(updated);
}
