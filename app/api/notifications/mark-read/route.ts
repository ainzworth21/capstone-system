import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const all = !!(body as { all?: boolean }).all;
  const id = String((body as { id?: string }).id ?? "").trim();

  if (all) {
    const count = markAllNotificationsRead(user.id);
    return NextResponse.json({ success: true, marked: count });
  }

  if (!id) {
    return NextResponse.json(
      { error: "Provide id or { all: true }." },
      { status: 400 }
    );
  }

  const ok = markNotificationRead(user.id, id);
  if (!ok) {
    return NextResponse.json(
      { error: "Notification not found or already read." },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
