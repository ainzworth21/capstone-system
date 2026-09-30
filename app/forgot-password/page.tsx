"use client";

import { useState } from "react";
import Link from "next/link";
import CvsuLogo from "@/components/CvsuLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResetUrl("");
    setExpiresAt("");
    setCopied(false);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not process your request.");
      return;
    }

    setMessage(
      data.message ||
        "If an eligible account exists for that email, a password reset link has been prepared."
    );
    if (data.resetUrl) {
      setResetUrl(data.resetUrl);
      setExpiresAt(data.expiresAt || "");
    }
  }

  async function copyLink() {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the link and copy it manually.");
    }
  }

  function expiryLabel() {
    if (!expiresAt) return "1 hour";
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return "1 hour";
    return d.toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <CvsuLogo size={72} priority />
          </div>
          <h2 style={{ fontSize: "1.5rem", margin: ".25rem 0" }}>
            Forgot password
          </h2>
          <p className="text-muted">
            Enter the email for your participant account. If email
            delivery is configured, we will send a one-time reset link;
            otherwise a demo link is shown on screen.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && !error && (
          <div className="alert alert-success">{message}</div>
        )}

        {!resetUrl && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="you@cvsu.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-gold btn-block btn-lg"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        {resetUrl && (
          <div className="reset-demo-box">
            <p className="reset-demo-badge">Demo delivery</p>
            <p className="form-hint" style={{ marginBottom: ".75rem" }}>
              Email is not configured (<code>RESEND_API_KEY</code> missing), so
              the reset link is shown here. With Resend enabled on Vercel, this
              box is hidden and the link is emailed instead. Expires around{" "}
              {expiryLabel()}.
            </p>
            <div className="reset-demo-link">{resetUrl}</div>
            <div className="reset-demo-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void copyLink()}
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
              <Link href={resetUrl} className="btn btn-gold">
                Open reset page
              </Link>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-block mt-4"
              onClick={() => {
                setResetUrl("");
                setMessage("");
                setExpiresAt("");
                setCopied(false);
              }}
            >
              Request another link
            </button>
          </div>
        )}

        <hr className="divider" />
        <p className="text-muted text-center" style={{ fontSize: ".9rem" }}>
          Remembered it?{" "}
          <Link
            href="/login"
            style={{ color: "var(--primary)", fontWeight: 600 }}
          >
            Sign in
          </Link>
        </p>
        <p className="text-center mt-4">
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
