"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SpeakerApprovalActions({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next: "approved" | "rejected" | "pending") {
    const labels = {
      approved: "Approve this speaker?",
      rejected: "Reject this speaker registration?",
      pending: "Set this speaker back to pending?",
    };
    if (!confirm(labels[next])) return;

    setLoading(true);
    setError("");
    const res = await fetch("/api/users/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, status: next }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to update status.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="speaker-approval-actions">
      {error && (
        <div style={{ color: "var(--danger)", fontSize: ".75rem", marginBottom: ".35rem" }}>
          {error}
        </div>
      )}
      {status === "pending" && (
        <>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={loading}
            onClick={() => setStatus("approved")}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            disabled={loading}
            onClick={() => setStatus("rejected")}
          >
            Reject
          </button>
        </>
      )}
      {status === "approved" && (
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          disabled={loading}
          onClick={() => setStatus("rejected")}
        >
          Revoke
        </button>
      )}
      {status === "rejected" && (
        <>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={loading}
            onClick={() => setStatus("approved")}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={loading}
            onClick={() => setStatus("pending")}
          >
            Pending
          </button>
        </>
      )}
    </div>
  );
}
