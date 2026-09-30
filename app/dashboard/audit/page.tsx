import { getSessionUser } from "@/lib/session";
import { requireAdmin } from "@/lib/speaker-portal";
import { listAuditLog } from "@/lib/audit";
import { AuditAction } from "@/lib/types";

const ACTION_LABELS: Record<AuditAction, string> = {
  user_delete: "User deleted",
  speaker_status: "Speaker status",
  admin_password_reset: "Password reset",
  backup_download: "Backup download",
  certificate_issue: "Certificate issued",
  speaker_certificate_issue: "Speaker certificate",
};

export default async function AuditPage() {
  const user = await getSessionUser();
  requireAdmin(user);

  const rows = listAuditLog(200);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Audit log</h1>
          <p className="text-muted">
            Latest {rows.length} admin / system actions (append-only, read-only)
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Summary</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-empty">
                      No audit entries yet. Deletes, approvals, resets, backups,
                      and certificate issues will appear here.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: ".8125rem" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-approved">
                        {ACTION_LABELS[r.action] ?? r.action}
                      </span>
                    </td>
                    <td style={{ fontSize: ".8125rem" }}>
                      <div>{r.actor_email || "—"}</div>
                      <div className="text-muted">{r.actor_role || ""}</div>
                    </td>
                    <td style={{ fontSize: ".875rem" }}>{r.summary}</td>
                    <td
                      className="text-muted"
                      style={{ fontSize: ".75rem", maxWidth: 160 }}
                    >
                      {r.target_type
                        ? `${r.target_type}${r.target_id ? ` · ${r.target_id.slice(0, 8)}…` : ""}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
