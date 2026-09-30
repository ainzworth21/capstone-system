"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  speaker: {
    id: string;
    full_name: string;
    email: string;
    title_position: string;
    affiliation: string;
    bio: string;
    speaker_active: boolean;
  };
}

export default function EditSpeakerForm({ speaker }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: speaker.full_name,
    email: speaker.email,
    title_position: speaker.title_position,
    affiliation: speaker.affiliation,
    bio: speaker.bio,
    speaker_active: speaker.speaker_active,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const res = await fetch(`/api/speakers/${speaker.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to save.");
      return;
    }
    setSuccess("Speaker saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
      <div className="card-body">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            className="form-control"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Title / Position</label>
          <input
            className="form-control"
            placeholder="Mr. / Professor / Dr. / Engr."
            value={form.title_position}
            onChange={(e) => set("title_position", e.target.value)}
          />
          <div className="form-hint">
            Example: Professor, Dr., Engr., Ir., etc.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Affiliation</label>
          <input
            className="form-control"
            placeholder="CvSU / UiTM"
            value={form.affiliation}
            onChange={(e) => set("affiliation", e.target.value)}
          />
          <div className="form-hint">
            Example: University / Organization and Department
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Short Bio</label>
          <textarea
            className="form-control"
            rows={5}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Brief background of the speaker…"
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <input
              type="checkbox"
              checked={form.speaker_active}
              onChange={(e) => set("speaker_active", e.target.checked)}
            />
            Active speaker
          </label>
        </div>

        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Save Speaker"}
          </button>
          <Link href="/dashboard/speakers" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
