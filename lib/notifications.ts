import { findOne, insertOne, readDB, writeDB } from "@/lib/db";
import { AppNotification, NotificationType, User } from "@/lib/types";
import { generateId, now } from "@/lib/utils";

export function createNotification(input: {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
}): AppNotification | null {
  if (!input.user_id) return null;
  const user = findOne<User>("users", (u) => u.id === input.user_id);
  if (!user) return null;

  const item: AppNotification = {
    id: generateId(),
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? null,
    read_at: null,
    created_at: now(),
  };
  insertOne("notifications", item);
  return item;
}

export function listNotificationsForUser(
  userId: string,
  limit = 30
): AppNotification[] {
  return readDB<AppNotification>("notifications")
    .filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export function unreadCountForUser(userId: string): number {
  return readDB<AppNotification>("notifications").filter(
    (n) => n.user_id === userId && !n.read_at
  ).length;
}

export function markNotificationRead(
  userId: string,
  notificationId: string
): boolean {
  return updateOwned(userId, (n) => n.id === notificationId);
}

export function markAllNotificationsRead(userId: string): number {
  const all = readDB<AppNotification>("notifications");
  let count = 0;
  const stamp = now();
  const updated = all.map((n) => {
    if (n.user_id === userId && !n.read_at) {
      count += 1;
      return { ...n, read_at: stamp };
    }
    return n;
  });
  if (count > 0) writeDB("notifications", updated);
  return count;
}

function updateOwned(
  userId: string,
  predicate: (n: AppNotification) => boolean
): boolean {
  const all = readDB<AppNotification>("notifications");
  let found = false;
  const stamp = now();
  const updated = all.map((n) => {
    if (n.user_id === userId && !n.read_at && predicate(n)) {
      found = true;
      return { ...n, read_at: stamp };
    }
    return n;
  });
  if (found) writeDB("notifications", updated);
  return found;
}
