import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  listNotificationsForUser,
  unreadCountForUser,
} from "@/lib/notifications";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = listNotificationsForUser(user.id, 40);
  return NextResponse.json({
    unread: unreadCountForUser(user.id),
    notifications,
  });
}
