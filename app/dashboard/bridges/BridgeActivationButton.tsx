"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BridgeActivationButton({
  bridgeId,
  isActive,
}: {
  bridgeId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function toggleBridge() {
    if (isActive && !window.confirm("Turn off this Bridge? Existing event, attendance, and certificate records will be retained, but new events and registrations will close.")) {
      return;
    }

    setSaving(true);
    setError("");
    const response = await fetch("/api/bridges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bridgeId, is_active: !isActive }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Could not update this Bridge.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="bridge-workspace-actions">
      <button
        type="button"
        className={`btn ${isActive ? "btn-secondary bridge-turn-off" : "btn-gold bridge-turn-on"} bridge-status-action`}
        onClick={toggleBridge}
        disabled={saving}
      >
        {saving ? "Saving..." : isActive ? "Turn Off Bridge" : "Turn On to Create Events"}
      </button>
      {error && <span className="bridge-action-error" role="alert">{error}</span>}
    </div>
  );
}
