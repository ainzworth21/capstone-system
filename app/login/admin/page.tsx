"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CvsuLogo from "@/components/CvsuLogo";
import { getParticipantLoginHref, getSpeakerLoginHref } from "@/lib/auth-links";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, portal: "admin" }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Admin sign in failed.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark"><CvsuLogo size={72} priority /></div>
          <h2 style={{ fontSize: "1.5rem", margin: ".25rem 0" }}>Admin Sign In</h2>
          <p className="text-muted">Secretariat administrators only</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus disabled={loading} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
          </div>
          <button type="submit" className="btn btn-gold btn-block btn-lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign In as Admin"}
          </button>
        </form>
        <hr className="divider" />
        <p className="text-muted text-center" style={{ fontSize: ".9rem" }}>
          Participant? <Link href={getParticipantLoginHref()} style={{ color: "var(--primary)", fontWeight: 600 }}>Participant Login</Link>
        </p>
        <p className="text-muted text-center" style={{ fontSize: ".9rem" }}>
          Speaker? <Link href={getSpeakerLoginHref()} style={{ color: "var(--primary)", fontWeight: 600 }}>Speaker Login</Link>
        </p>
      </div>
    </div>
  );
}
