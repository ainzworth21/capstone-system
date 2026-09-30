"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

export default function SeedDemoButton({
  eventCount,
}: {
  eventCount: number;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const needsForce = eventCount > 0;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading]);

  async function runSeed() {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/seed-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: needsForce ? force : false }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not load demo events.");
      return;
    }
    setMessage(data.message || "Demo events added.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          setError("");
          setForce(false);
          setOpen(true);
        }}
        title="Add 3 sample webinars/seminars for demos"
      >
        Load demo events
      </button>
      {message && (
        <span className="text-muted" style={{ fontSize: ".8rem", marginLeft: ".5rem" }}>
          {message}
        </span>
      )}

      {open && (
        <div
          className="confirm-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div
            className="confirm-delete-backdrop"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="confirm-delete-panel"
            style={{ borderTopColor: "var(--gold)" }}
          >
            <div className="confirm-delete-header">
              <h2 id={titleId}>Load demo events?</h2>
              <p className="confirm-delete-warn" style={{ color: "var(--gold-dark)" }}>
                Adds 3 sample webinars/seminars and demo categories. Users are not wiped.
              </p>
            </div>
            <ul className="confirm-delete-effects">
              <li>Campus Digital Literacy (webinar)</li>
              <li>Student Leadership Forum (seminar)</li>
              <li>Research Writing Essentials (webinar)</li>
            </ul>
            {needsForce ? (
              <label
                style={{
                  display: "flex",
                  gap: ".5rem",
                  alignItems: "flex-start",
                  margin: "0.75rem 0",
                  fontSize: ".875rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  disabled={loading}
                />
                <span>
                  Catalog already has <strong>{eventCount}</strong> event(s). I
                  still want to add demo events (force).
                </span>
              </label>
            ) : (
              <p className="text-muted" style={{ fontSize: ".875rem" }}>
                Catalog is empty — demo events will be created.
              </p>
            )}
            {error && <div className="confirm-delete-error">{error}</div>}
            <div className="confirm-delete-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-gold"
                disabled={loading || (needsForce && !force)}
                onClick={() => void runSeed()}
              >
                {loading ? "Loading…" : "Add demo events"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
