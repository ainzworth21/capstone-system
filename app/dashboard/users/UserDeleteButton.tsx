"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UserDeleteButton({
  userId,
  userName,
  userEmail,
  roleLabel,
}: {
  userId: string;
  userName: string;
  userEmail?: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nameMatches =
    confirmText.trim().toLowerCase() === userName.trim().toLowerCase();

  function closeModal() {
    if (loading) return;
    setOpen(false);
    setConfirmText("");
    setError("");
  }

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading]);

  async function confirmDelete() {
    if (!nameMatches || loading) return;

    setLoading(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to delete user.");
      return;
    }
    setOpen(false);
    setConfirmText("");
    router.refresh();
  }

  return (
    <div className="user-delete-wrap">
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={() => {
          setError("");
          setConfirmText("");
          setOpen(true);
        }}
        title="Delete user"
      >
        Delete
      </button>

      {open && (
        <div
          className="confirm-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div
            className="confirm-delete-backdrop"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div className="confirm-delete-panel">
            <div className="confirm-delete-header">
              <h2 id={titleId}>Delete this account?</h2>
              <p className="confirm-delete-warn">
                This action cannot be undone.
              </p>
            </div>

            <div className="confirm-delete-user">
              <div className="confirm-delete-user-name">{userName}</div>
              {userEmail && (
                <div className="confirm-delete-user-meta">{userEmail}</div>
              )}
              <div className="confirm-delete-user-meta">
                Role: {roleLabel}
              </div>
            </div>

            <ul className="confirm-delete-effects">
              <li>The account will be removed and they will not be able to log in.</li>
              <li>
                If this is a speaker, their assignment will be cleared from
                linked events (event history is kept).
              </li>
              <li>Uploaded speaker ID photos for this account will be removed.</li>
            </ul>

            <label className="confirm-delete-label" htmlFor={`confirm-name-${userId}`}>
              Type the full name <strong>{userName}</strong> to confirm
            </label>
            <input
              id={`confirm-name-${userId}`}
              ref={inputRef}
              className="form-control"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Type the full name exactly"
              value={confirmText}
              disabled={loading}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void confirmDelete();
                }
              }}
            />

            {error && <div className="confirm-delete-error">{error}</div>}

            <div className="confirm-delete-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void confirmDelete()}
                disabled={!nameMatches || loading}
                title={
                  nameMatches
                    ? "Permanently delete this account"
                    : "Type the full name to enable delete"
                }
              >
                {loading ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
