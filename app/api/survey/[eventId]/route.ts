import { NextRequest, NextResponse } from "next/server";
import { getPostTestForEvent } from "@/lib/bridge-settings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  return NextResponse.json(getPostTestForEvent(eventId));
}

export async function POST() {
  return NextResponse.json(
    { error: "Post-tests are managed from Global Settings or the event's Bridge Settings." },
    { status: 400 }
  );
}
