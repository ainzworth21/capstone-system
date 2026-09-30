import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, findOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Feedback, Event } from "@/lib/types";
import { now } from "@/lib/utils";
import { canManageEvent, isStaff } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!isStaff(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = new URL(req.url).searchParams.get("event_id");
  let feedback = readDB<Feedback>("feedback").filter(
    (f) => f.submitted_at !== null
  );

  if (eventId) {
    const event = findOne<Event>("events", (e) => e.id === eventId);
    if (!canManageEvent(user, event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    feedback = feedback.filter((f) => f.event_id === eventId);
  } else if (user!.role === "organizer") {
    const myIds = new Set(
      readDB<Event>("events")
        .filter((e) => e.organizer_id === user!.id)
        .map((e) => e.id)
    );
    feedback = feedback.filter((f) => myIds.has(f.event_id));
  }

  // Never expose feedback tokens
  return NextResponse.json(
    feedback.map(({ feedback_token: _t, ...rest }) => rest)
  );
}

export async function POST(req: NextRequest) {
  const { feedback_token, rating, comment } = await req.json();
  if (!feedback_token || !rating) {
    return NextResponse.json(
      { error: "Token and rating required." },
      { status: 400 }
    );
  }

  const feedbackList = readDB<Feedback>("feedback");
  const idx = feedbackList.findIndex((f) => f.feedback_token === feedback_token);
  if (idx === -1)
    return NextResponse.json({ error: "Invalid token." }, { status: 404 });
  if (feedbackList[idx].submitted_at) {
    return NextResponse.json({ error: "Already submitted." }, { status: 409 });
  }

  feedbackList[idx] = {
    ...feedbackList[idx],
    rating: Number(rating),
    comment: comment ?? "",
    submitted_at: now(),
  };
  writeDB("feedback", feedbackList);
  return NextResponse.json({ ok: true });
}
