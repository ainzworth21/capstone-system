"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Admin registers a speaker by name + email (magic-link login). */
export default function RegisterSpeakerForm({
  buttonLabel = "Register speaker",
  submitLabel = "Register speaker",
}: {
  buttonLabel?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    title_position: "",
    affiliation: "",
  });
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setHint("");
    setLoading(true);
    const res = await fetch("/api/speakers/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not register speaker.");
      return;
    }
    setHint(
      data.message ||
        `Speaker registered. They can sign in at /login/speaker with ${form.email}.`
    );
    setForm({
      full_name: "",
      email: "",
      title_position: "",
      affiliation: "",
    });
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-gold"
        onClick={() => {
          setOpen((v) => !v);
          setError("");
        }}
      >
        {open ? "Hide form" : buttonLabel}
      </button>
      {open && (
        <div className="card" style={{ marginTop: "1rem", maxWidth: 480 }}>
          <div className="card-body">
            <p
              className="text-muted"
              style={{ fontSize: ".875rem", marginTop: 0 }}
            >
              Ask the speaker for their email, then register them here. They
              sign in at <strong>/login/speaker</strong> with that email anytime
              (no password).
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full name *</label>
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
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  placeholder="speaker@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
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
              {error && (
                <div
                  className="alert alert-danger"
                  style={{ marginBottom: ".75rem" }}
                >
                  {error}
                </div>
              )}
              {hint && (
                <div
                  className="alert alert-success"
                  style={{ marginBottom: ".75rem" }}
                >
                  {hint}
                </div>
              )}
              <button type="submit" className="btn btn-gold" disabled={loading}>
                {loading ? "Registering…" : submitLabel}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
