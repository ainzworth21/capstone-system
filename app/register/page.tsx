"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DESIGNATIONS } from "@/lib/registration-fields";
import CvsuLogo from "@/components/CvsuLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    middle_initial: "",
    last_name: "",
    name_suffix: "",
    email: "",
    password: "",
    confirm: "",
    student_id: "",
    course: "",
    year_level: "",
    designation: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [modal, setModal] = useState<{
    title: string;
    body: string;
  } | null>(null);

  function set(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || done) return;
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "student", name_prefix: "" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Registration failed.");
      return;
    }

    setDone(true);
    setModal({
      title: "Registration complete",
      body: data.message || "Your participant account is ready. You can sign in now.",
    });
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <CvsuLogo size={72} priority />
          </div>
          <h2 style={{ fontSize: "1.5rem", margin: ".25rem 0" }}>
            Create Participant Account
          </h2>
          <p className="text-muted">
            Speakers are invited by the secretariat — they do not self-register.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                className="form-control"
                placeholder="Juan"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                className="form-control"
                placeholder="dela Cruz"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Middle Initial</label>
              <input
                className="form-control"
                placeholder="A"
                maxLength={1}
                value={form.middle_initial}
                onChange={(e) =>
                  set(
                    "middle_initial",
                    e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 1)
                  )
                }
                style={{ textTransform: "uppercase", maxWidth: 80 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Suffix</label>
              <select
                className="form-control"
                value={form.name_suffix}
                onChange={(e) => set("name_suffix", e.target.value)}
              >
                <option value="">—</option>
                {["Jr.", "Sr.", "II", "III", "IV", "V"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@cvsu.edu.ph"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Designation *</label>
            <select
              className="form-control"
              value={form.designation}
              onChange={(e) => set("designation", e.target.value)}
              required
            >
              <option value="" disabled>
                Select designation
              </option>
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ID Number</label>
            <input
              className="form-control"
              placeholder="e.g. 2021-00123"
              value={form.student_id}
              onChange={(e) => set("student_id", e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Course / Program</label>
              <input
                className="form-control"
                placeholder="e.g. BSIT (or N/A if not a student)"
                value={form.course}
                onChange={(e) => set("course", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Year Level</label>
              <select
                className="form-control"
                value={form.year_level}
                onChange={(e) => set("year_level", e.target.value)}
                required
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y}
                    {["st", "nd", "rd", "th", "th"][y - 1]} Year
                  </option>
                ))}
                <option value="0">N/A (Faculty / Staff / Others)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-gold btn-block btn-lg"
            disabled={loading || done}
          >
            {done ? "Submitted" : loading ? "Submitting…" : "Create Account"}
          </button>
        </form>

        <hr className="divider" />
        <p className="text-muted text-center" style={{ fontSize: ".9rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
        <p className="text-muted text-center" style={{ fontSize: ".875rem" }}>
          Speaker?{" "}
          <Link
            href="/login/speaker"
            style={{ color: "var(--primary)", fontWeight: 600 }}
          >
            Email-only sign in
          </Link>
        </p>
      </div>

      {modal && (
        <div
          className="reg-success-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-success-title"
        >
          <div className="reg-success-backdrop" aria-hidden="true" />
          <div className="reg-success-panel">
            <div className="reg-success-icon ok" aria-hidden="true">
              OK
            </div>
            <h2 id="reg-success-title">{modal.title}</h2>
            <p className="reg-success-body">{modal.body}</p>
            <button
              type="button"
              className="btn btn-gold btn-block"
              onClick={() => router.push("/login")}
            >
              Go to sign in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
