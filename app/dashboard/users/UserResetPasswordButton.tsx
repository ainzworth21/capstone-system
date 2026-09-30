"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UserResetPasswordButton({
  userId,
  userName,
  userEmail,
  roleLabel,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const copyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!confirmOpen && !resultOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        setConfirmOpen(false);
        if (!tempPassword) setResultOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [confirmOpen, resultOpen, loading, tempPassword]);

  async function runReset() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to reset password.");
      return;
    }
    setConfirmOpen(false);
    setTempPassword(data.tempPassword || "");
    setResultOpen(true);
    router.refresh();
  }

  async function copyPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      copyRef.current?.select();
    }
  }

  return (
    <div className="user-reset-wrap">
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => {
          setError("");
          setConfirmOpen(true);
        }}
        title="Issue a temporary password"
      >
        Reset password
      </button>

      {confirmOpen && (
        <div
          className="confirm-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div
            className="confirm-delete-backdrop"
            onClick={() => !loading && setConfirmOpen(false)}
            aria-hidden="true"
          />
          <div className="confirm-delete-panel" style={{ borderTopColor: "var(--gold)" }}>
            <div className="confirm-delete-header">
              <h2 id={titleId}>Reset password?</h2>
              <p className="confirm-delete-warn" style={{ color: "var(--gold-dark)" }}>
                A temporary password will be generated once.
              </p>
            </div>
            <div className="confirm-delete-user">
              <div className="confirm-delete-user-name">{userName}</div>
              <div className="confirm-delete-user-meta">{userEmail}</div>
              <div className="confirm-delete-user-meta">Role: {roleLabel}</div>
            </div>
            <ul className="confirm-delete-effects">
              <li>Their current password will stop working immediately.</li>
              <li>You must give them the temporary password securely.</li>
              <li>They will be required to choose a new password on next login.</li>
            </ul>
            {error && <div className="confirm-delete-error">{error}</div>}
            <div className="confirm-delete-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-gold"
                disabled={loading}
                onClick={() => void runReset()}
              >
                {loading ? "Generating…" : "Generate temporary password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resultOpen && tempPassword && (
        <div
          className="confirm-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${titleId}-result`}
        >
          <div className="confirm-delete-backdrop" aria-hidden="true" />
          <div className="confirm-delete-panel" style={{ borderTopColor: "var(--gold)" }}>
            <div className="confirm-delete-header">
              <h2 id={`${titleId}-result`}>Temporary password</h2>
              <p className="confirm-delete-warn" style={{ color: "var(--danger)" }}>
                Copy this now — it will not be shown again.
              </p>
            </div>
            <div className="confirm-delete-user">
              <div className="confirm-delete-user-name">{userName}</div>
              <div className="confirm-delete-user-meta">{userEmail}</div>
            </div>
            <label className="confirm-delete-label" htmlFor={`temp-pw-${userId}`}>
              Temporary password
            </label>
            <input
              id={`temp-pw-${userId}`}
              ref={copyRef}
              className="form-control"
              readOnly
              value={tempPassword}
              onFocus={(e) => e.target.select()}
            />
            <div className="confirm-delete-actions">
              <button type="button" className="btn btn-primary" onClick={() => void copyPassword()}>
                {copied ? "Copied!" : "Copy password"}
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => {
                  setResultOpen(false);
                  setTempPassword("");
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
