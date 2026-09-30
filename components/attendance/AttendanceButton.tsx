"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AttendanceButton({ participantId }: { participantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markAttended() {
    setLoading(true);
    await fetch("/api/attendance/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={markAttended} disabled={loading} className="btn btn-gold btn-sm">
      {loading ? "…" : "Mark Attended"}
    </button>
  );
}
