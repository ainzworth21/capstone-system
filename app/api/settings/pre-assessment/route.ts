import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { PreAssessment } from "@/lib/types";
import { generateId, now } from "@/lib/utils";

const UNIVERSAL_ID = "universal";

export async function GET() {
  const assessments = readDB<PreAssessment>("pre_assessments");
  const universal = assessments.find((a) => a.event_id === UNIVERSAL_ID) ?? null;
  return NextResponse.json(universal);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const assessments = readDB<PreAssessment>("pre_assessments");
  const idx = assessments.findIndex((a) => a.event_id === UNIVERSAL_ID);

  const record: PreAssessment = {
    id: idx >= 0 ? assessments[idx].id : generateId(),
    event_id: UNIVERSAL_ID,
    questions: (body.questions ?? []).filter((q: { question?: string }) => (q.question ?? "").trim() !== ""),
    created_at: idx >= 0 ? assessments[idx].created_at : now(),
  };

  if (idx >= 0) assessments[idx] = record;
  else assessments.push(record);
  writeDB("pre_assessments", assessments);
  return NextResponse.json(record);
}
