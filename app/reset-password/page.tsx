"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import CvsuLogo from "@/components/CvsuLogo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(
    () => (searchParams.get("token") ?? "").trim(),
    [searchParams]
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Missing reset token. Request a new link from Forgot password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not reset password.");
      return;
    }

    setSuccess(data.message || "Password updated. Redirecting to sign in…");
    window.setTimeout(() => {
      router.push("/login?reset=1");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <div className="auth-logo-mark">
          <CvsuLogo size={72} priority />
        </div>
        <h2 style={{ fontSize: "1.5rem", margin: ".25rem 0" }}>
          Set a new password
        </h2>
        <p className="text-muted">
          Choose a new password for your participant or speaker account.
        </p>
      </div>

      {!token && (
        <div className="alert alert-error">
          This page needs a valid reset token.{" "}
          <Link href="/forgot-password" style={{ fontWeight: 600 }}>
            Request a new link
          </Link>
          .
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {token && !success && (
        <form onSubmit={handleSubmit}>
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
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Re-enter new password"
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
      <p className="text-muted text-center" style={{ fontSize: ".9rem" }}>
        <Link
          href="/login"
          style={{ color: "var(--primary)", fontWeight: 600 }}
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-wrapper">
      <Suspense
        fallback={
          <div className="auth-card">
            <p className="text-muted text-center">Loading…</p>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
