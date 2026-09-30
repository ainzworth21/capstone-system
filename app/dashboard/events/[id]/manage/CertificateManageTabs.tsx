"use client";

import { useState } from "react";
import Link from "next/link";
import { IssuedSpeakerCertificate } from "@/lib/types";

export type SpeakerCertTarget = {
  id: string;
  name: string;
  issued: IssuedSpeakerCertificate | null;
};

export default function CertificateManageTabs({
  eventId,
  speakers,
  bridgeId,
}: {
  eventId: string;
  speakers: SpeakerCertTarget[];
  bridgeId?: string;
}) {
  const [tab, setTab] = useState<"student" | "speaker">("student");
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [certs, setCerts] = useState<Record<string, IssuedSpeakerCertificate | null>>(
    () => Object.fromEntries(speakers.map((s) => [s.id, s.issued]))
  );

  async function issueSpeakerCert(speakerId: string) {
    setIssuingId(speakerId);
    setMsg("");
    const res = await fetch(`/api/certificate/${eventId}/speaker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker_user_id: speakerId }),
    });
    const data = await res.json();
    setIssuingId(null);
    if (!res.ok) {
      setMsg(data.error || "Failed to issue speaker certificate.");
      return;
    }
    setCerts((prev) => ({ ...prev, [speakerId]: data }));
    setMsg("Speaker certificate issued successfully.");
  }

  return (
    <div>
      <div className="report-tabs" style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          className={`report-tab ${tab === "student" ? "active" : ""}`}
          onClick={() => setTab("student")}
        >
          Student Certificate
        </button>
        <button
          type="button"
          className={`report-tab ${tab === "speaker" ? "active" : ""}`}
          onClick={() => setTab("speaker")}
        >
          Speaker Certificate
        </button>
      </div>

      {tab === "student" && (
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: "0 0 .75rem", fontSize: ".9375rem" }}>
              Student Certificate of Participation
            </h3>
            <p className="text-muted" style={{ margin: "0 0 1rem", fontSize: ".875rem" }}>
              Students receive this after attendance, pre-test, quiz, and post-test requirements are met. Design the template in {bridgeId ? "Bridge Settings" : "Global Settings"}.
            </p>
            <Link
              href={bridgeId ? `/dashboard/bridges/${bridgeId}?tab=settings` : "/dashboard/settings?tab=certificate"}
              className="btn btn-secondary btn-sm"
            >
              {bridgeId ? "Edit Participant Certificate in Bridge Settings" : "Edit Student Certificate in Global Settings"}
            </Link>
          </div>
        </div>
      )}

      {tab === "speaker" && (
        <>
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <div className="card-body">
              <h3 style={{ margin: "0 0 .75rem", fontSize: ".9375rem" }}>
                Issue Speaker Certificates
              </h3>
              {speakers.length === 0 ? (
                <p className="text-muted" style={{ margin: 0, fontSize: ".875rem" }}>
                  No registered speakers are linked to this event. Edit the event
                  and select speakers from the picker first.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {speakers.map((sp, idx) => {
                    const cert = certs[sp.id];
                    return (
                      <div
                        key={sp.id}
                        style={{
                          padding: ".75rem 0",
                          borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                        }}
                      >
                        <p style={{ margin: "0 0 .5rem", fontSize: ".875rem" }}>
                          Speaker: <strong>{sp.name || "—"}</strong>
                        </p>
                        {cert ? (
                          <div className="alert alert-success" style={{ marginBottom: 0 }}>
                            Issued on{" "}
                            {new Date(cert.issued_at).toLocaleString()} · Code:{" "}
                            <code>{cert.verification_code}</code>
                            <div style={{ marginTop: ".5rem" }}>
                              <a
                                href={`/verify/${encodeURIComponent(cert.verification_code)}`}
                                className="btn btn-sm btn-secondary"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open verify page
                              </a>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-gold btn-sm"
                            onClick={() => issueSpeakerCert(sp.id)}
                            disabled={issuingId === sp.id}
                          >
                            {issuingId === sp.id
                              ? "Issuing…"
                              : "Issue Speaker Certificate"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {msg && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: ".8125rem",
                        color: msg.includes("success")
                          ? "var(--primary-dark)"
                          : "var(--danger)",
                      }}
                    >
                      {msg}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <p className="text-muted" style={{ margin: "0 0 1rem", fontSize: ".875rem" }}>
                Design the Certificate of Appreciation template in {bridgeId ? "Bridge Settings" : "Global Settings"} (Speaker Certificate tab).
              </p>
              <Link
                href={bridgeId ? `/dashboard/bridges/${bridgeId}?tab=settings` : "/dashboard/settings?tab=certificate&cert=speaker"}
                className="btn btn-secondary btn-sm"
              >
                {bridgeId ? "Edit Speaker Certificate in Bridge Settings" : "Edit Speaker Certificate in Global Settings"}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
