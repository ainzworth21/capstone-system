import { insertOne, readDB } from "@/lib/db";
import { AuditAction, AuditLogEntry } from "@/lib/types";
import { generateId, now } from "@/lib/utils";

export function writeAuditLog(input: {
  action: AuditAction;
  actor_id: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  summary: string;
  meta?: Record<string, unknown> | null;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateId(),
    action: input.action,
    actor_id: input.actor_id,
    actor_email: input.actor_email ?? null,
    actor_role: input.actor_role ?? null,
    target_type: input.target_type ?? null,
    target_id: input.target_id ?? null,
    summary: input.summary,
    meta: input.meta ?? null,
    created_at: now(),
  };
  insertOne("audit_log", entry);
  return entry;
}

export function listAuditLog(limit = 200): AuditLogEntry[] {
  return readDB<AuditLogEntry>("audit_log")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}
