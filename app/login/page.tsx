"use client";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CvsuLogo from "@/components/CvsuLogo";
import { getSpeakerLoginHref } from "@/lib/auth-links";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, portal: "participant" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      const wait = Number(data.retryAfterSec) || 0;
      if (res.status === 429 && wait > 0) setRetryAfterSec(wait);
      setError(data.error || "Sign in failed.");
      return;
    }

    setRetryAfterSec(0);
    if (data.must_change_password) {
      router.push("/change-password");
    } else if (data.role === "admin") {
      router.push("/dashboard");
    } else {
      router.push("/student/dashboard");
    }
    router.refresh();
  }

  const locked = retryAfterSec > 0;

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <div className="auth-logo-mark">
          <CvsuLogo size={72} priority />
        </div>
        <h2 style={{ fontSize: "1.5rem", margin: ".25rem 0" }}>
          Sign In
        </h2>
        <p className="text-muted">
          Participants — email and password
        </p>
      </div>

      {justReset && !error && (
        <div className="alert alert-success">
          Password updated. Sign in with your new password.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

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
            disabled={loading || locked}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || locked}
          />
          <p className="auth-forgot-row">
            <Link href="/forgot-password" className="auth-forgot-link">
              Forgot password?
            </Link>
          </p>
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
      <p className="text-muted text-center" style={{ fontSize: ".9rem" }}>
        New participant?{" "}
        <Link
          href="/register"
          style={{ color: "var(--primary)", fontWeight: 600 }}
        >
          Create an account
        </Link>
      </p>
      <p className="text-muted text-center" style={{ fontSize: ".9rem" }}>
        Speaker?{" "}
        <Link
          href={getSpeakerLoginHref()}
          style={{ color: "var(--primary)", fontWeight: 600 }}
        >
          Sign In
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
  );
}

export default function LoginPage() {
  return (
    <div className="auth-wrapper">
      <Suspense
        fallback={
          <div className="auth-card">
            <p className="text-muted text-center">Loading…</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
