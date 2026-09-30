import { getSessionUser } from "@/lib/session";
import { readDB } from "@/lib/db";
import { User } from "@/lib/types";
import { redirect } from "next/navigation";
import UserDeleteButton from "./UserDeleteButton";
import UserResetPasswordButton from "./UserResetPasswordButton";
import RegisterSpeakerForm from "@/components/RegisterSpeakerForm";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  let users = readDB<User>("users").map(({ password: _p, ...u }) => u);

  if (sp.role) users = users.filter((u) => u.role === sp.role);
  if (sp.status) {
    users = users.filter((u) => (u.account_status ?? "approved") === sp.status);
  }
  if (sp.search) {
    const q = sp.search.toLowerCase();
    users = users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }

  users = users.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const speakerCount = users.filter((u) => u.role === "organizer").length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Users</h1>
          <p className="text-muted">
            Participants, speakers, and secretariat accounts
            {speakerCount > 0 ? ` · ${speakerCount} speaker${speakerCount === 1 ? "" : "s"} shown` : ""}
          </p>
        </div>
        <a
          href="/api/admin/backup"
          className="btn btn-secondary"
          title="Saves under backup/snapshots/ and downloads a ZIP"
        >
          Download system backup
        </a>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <RegisterSpeakerForm
          buttonLabel="Register speaker"
          submitLabel="Register speaker"
        />
      </div>

      <form method="GET" className="filter-bar">
        <input
          name="search"
          className="form-control"
          placeholder="Search name or email…"
          defaultValue={sp.search ?? ""}
        />
        <select name="role" className="form-control" defaultValue={sp.role ?? ""}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="organizer">Speaker</option>
          <option value="student">Participant</option>
        </select>
        <select
          name="status"
          className="form-control"
          defaultValue={sp.status ?? ""}
        >
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
        <a href="/dashboard/users" className="btn btn-secondary">
          Clear
        </a>
      </form>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center text-muted"
                      style={{ padding: "2rem" }}
                    >
                      No users found.
                    </td>
                  </tr>
                )}
                {users.map((u, i) => {
                  const status = u.account_status ?? "approved";
                  const isSpeaker = u.role === "organizer";
                  return (
                    <tr key={u.id}>
                      <td>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                        {u.student_id && (
                          <div
                            style={{
                              fontSize: ".8rem",
                              color: "var(--gray-500)",
                            }}
                          >
                            {u.student_id} · {u.course} Y{u.year_level}
                          </div>
                        )}
                        {isSpeaker && (u.title_position || u.affiliation) && (
                          <div
                            style={{
                              fontSize: ".8rem",
                              color: "var(--gray-500)",
                            }}
                          >
                            {[u.title_position, u.affiliation]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: ".9rem" }}>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role}`}>
                          {u.role === "organizer"
                            ? "Speaker"
                            : u.role === "student"
                              ? "Participant"
                              : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${status}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: ".875rem",
                          color: "var(--gray-500)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="user-row-actions">
                          {u.id === session.id ? (
                            <span
                              className="text-muted"
                              style={{ fontSize: ".8rem" }}
                            >
                              You
                            </span>
                          ) : (
                            <>
                              {/* Speakers use email magic-link — no password reset */}
                              {u.role === "student" && (
                                <UserResetPasswordButton
                                  userId={u.id}
                                  userName={u.full_name}
                                  userEmail={u.email}
                                  roleLabel="Participant"
                                />
                              )}
                              {u.role !== "admin" && (
                                <UserDeleteButton
                                  userId={u.id}
                                  userName={u.full_name}
                                  userEmail={u.email}
                                  roleLabel={
                                    u.role === "organizer"
                                      ? "Speaker"
                                      : "Participant"
                                  }
                                />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
