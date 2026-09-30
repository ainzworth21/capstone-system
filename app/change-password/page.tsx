"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CvsuLogo from "@/components/CvsuLogo";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword,
        password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not update password.");
      return;
    }
    setSuccess(data.message || "Password updated.");
    window.setTimeout(() => {
      router.push(data.redirectTo || "/");
      router.refresh();
    }, 800);
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <CvsuLogo size={72} priority />
          </div>
          <h2 style={{ fontSize: "1.5rem", margin: ".25rem 0" }}>
            Change password
          </h2>
          <p className="text-muted">
            Enter your current password (temporary password if an admin just
            reset it), then choose a new one.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Current password</label>
              <input
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">New password</label>
              <input
                type="password"
                className="form-control"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <input
                type="password"
                className="form-control"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-gold btn-block btn-lg"
              disabled={loading}
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        )}

        <hr className="divider" />
        <p className="text-center">
          <Link
            href="/"
            style={{ fontSize: ".875rem", color: "var(--gray-500)" }}
          >
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
