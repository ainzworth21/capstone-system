"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CvsuLogo from "@/components/CvsuLogo";

export default function SpeakerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryAfterSec, setRetryAfterSec] = useState(0);

  useEffect(() => {
    if (retryAfterSec <= 0) return;
    const t = window.setTimeout(
      () => setRetryAfterSec((s) => Math.max(0, s - 1)),
      1000
    );
    return () => window.clearTimeout(t);
  }, [retryAfterSec]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || retryAfterSec > 0) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/speaker-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      const wait = Number(data.retryAfterSec) || 0;
      if (res.status === 429 && wait > 0) setRetryAfterSec(wait);
      setError(data.error || "Sign in failed.");
      return;
    }

    router.push("/speaker/dashboard");
    router.refresh();
  }

  const locked = retryAfterSec > 0;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <CvsuLogo size={72} priority />
          </div>
          <h2 style={{ fontSize: "1.5rem", margin: ".25rem 0" }}>
            Speaker Sign In
          </h2>
          <p className="text-muted">
            Enter the email the secretariat registered for you. No password
            needed — you can sign in anytime with this email.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="speaker@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={loading || locked}
            />
          </div>
          <button
            type="submit"
            className="btn btn-gold btn-block btn-lg"
            disabled={loading || locked}
          >
            {loading
              ? "Signing in…"
              : locked
                ? `Try again in ${retryAfterSec}s`
                : "Sign In"}
          </button>
        </form>

        <hr className="divider" />
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
