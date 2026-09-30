"use client";

import { useState } from "react";
import { CertificateTemplate } from "@/lib/types";
import GlobalCertificateEditor from "./GlobalCertificateEditor";

export default function GlobalCertificateTabs({
  studentTemplate,
  speakerTemplate,
  initialTab = "student",
}: {
  studentTemplate: CertificateTemplate | null;
  speakerTemplate: CertificateTemplate | null;
  initialTab?: "student" | "speaker";
}) {
  const [tab, setTab] = useState<"student" | "speaker">(initialTab);

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

      {/* Keep both mounted so saved position/style aren't reset when switching tabs */}
      <div style={{ display: tab === "student" ? "block" : "none" }}>
        <p className="report-note">
          Design the global <strong>Certificate of Participation</strong> for
          students. Used for every event unless an event overrides it. Name
          position you save is what live preview, full preview, and issued
          certificates use.
        </p>
        <GlobalCertificateEditor
          key={studentTemplate?.updated_at ?? "student-default"}
          initialData={studentTemplate}
          recipientType="student"
        />
      </div>

      <div style={{ display: tab === "speaker" ? "block" : "none" }}>
        <p className="report-note">
          Design the global <strong>Certificate of Appreciation</strong> for
          speakers. Issue a certificate per event under Manage Event →
          Certificate. Name position you save is what live preview, full
          preview, and issued certificates use.
        </p>
        <GlobalCertificateEditor
          key={speakerTemplate?.updated_at ?? "speaker-default"}
          initialData={speakerTemplate}
          recipientType="speaker"
        />
      </div>
    </div>
  );
}
