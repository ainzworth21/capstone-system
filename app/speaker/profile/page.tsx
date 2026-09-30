"use client";

import { useEffect, useState } from "react";

export default function SpeakerProfilePage() {
  const [form, setForm] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    email: "",
    title_position: "",
    affiliation: "",
    bio: "",
  });
  const [emailChangesRemaining, setEmailChangesRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/speakers/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setForm({
          full_name: data.full_name ?? "",
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          email: data.email ?? "",
          title_position: data.title_position ?? "",
          affiliation: data.affiliation ?? "",
          bio: data.bio ?? "",
        });
        setEmailChangesRemaining(data.email_changes_remaining ?? 0);
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    const res = await fetch("/api/speakers/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save profile.");
      return;
    }
    setMessage(data.message || "Profile saved.");
    if (typeof data.email_changes_remaining === "number") {
      setEmailChangesRemaining(data.email_changes_remaining);
    }
    if (data.email) {
      setForm((f) => ({ ...f, email: data.email }));
    }
  }

  if (loading) {
    return <p className="text-muted">Loading profile…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Profile</h2>
          <p className="text-muted">
            Update your display details. Sign in with your registered email
            (no password).
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                className="form-control"
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                required
                value={form.email}
                disabled={emailChangesRemaining < 1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              <div className="form-hint">
                {emailChangesRemaining > 0
                  ? "You may change this email once (temporary / invited accounts). After that it is locked."
                  : "Email is locked. Contact the secretariat if you need it updated."}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Title / position</label>
              <input
                className="form-control"
                value={form.title_position}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title_position: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Affiliation</label>
              <input
                className="form-control"
                value={form.affiliation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, affiliation: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                className="form-control"
                rows={4}
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
              />
            </div>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>
                {error}
              </div>
            )}
            {message && (
              <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
                {message}
              </div>
            )}
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
