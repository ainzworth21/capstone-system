"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelForm({ cancelToken, isStudent }: { cancelToken: string; isStudent: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    setLoading(true);
    const res = await fetch("/api/participants/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancel_token: cancelToken }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    if (isStudent) router.push("/student/my-events?cancelled=1");
    else router.push("/cancel-success");
  }

  return (
    <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
      {error && <p style={{ color: "var(--danger)", width: "100%" }}>{error}</p>}
      <a href={isStudent ? "/student/my-events" : "/"} className="btn btn-secondary">Keep Registration</a>
      <button onClick={handleCancel} disabled={loading} className="btn btn-danger">
        {loading ? "Cancelling…" : "Yes, Cancel Registration"}
      </button>
    </div>
  );
}
