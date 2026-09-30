"use client";
import { useState } from "react";
import { BridgeSettings, CertificateTemplate } from "@/lib/types";
import GlobalCertificateEditor from "@/app/dashboard/settings/GlobalCertificateEditor";
import GlobalPreAssessmentEditor from "@/app/dashboard/settings/GlobalPreAssessmentEditor";
import GlobalSurveyEditor from "@/app/dashboard/settings/GlobalSurveyEditor";

const sections = [
  ["pre_test", "Pre-test"],
  ["post_test", "Post-test"],
  ["participant_certificate", "Participant Certificate"],
  ["speaker_certificate", "Speaker Certificate"],
] as const;

type Section = (typeof sections)[number][0];

function certificateTemplate(
  settings: BridgeSettings["participant_certificate"],
  bridgeId: string,
  recipientType: "student" | "speaker"
): CertificateTemplate | null {
  return settings ? {
    ...settings,
    event_id: `bridge:${bridgeId}`,
    recipient_type: recipientType,
  } : null;
}

export default function BridgeSettingsEditor({
  bridgeId,
  bridgeTitle,
  initialSettings,
  modules,
}: {
  bridgeId: string;
  bridgeTitle: string;
  initialSettings: BridgeSettings;
  modules: string[];
}) {
  const [section, setSection] = useState<Section>("pre_test");
  const preTest = initialSettings.pre_test;
  const postTest = initialSettings.post_test;
  const participantTemplate = certificateTemplate(initialSettings.participant_certificate, bridgeId, "student");
  const speakerTemplate = certificateTemplate(initialSettings.speaker_certificate, bridgeId, "speaker");

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section>
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-body">
            <h3 style={{ margin: "0 0 .75rem" }}>Bridge Settings · {bridgeTitle}</h3>
            <h4>Bridge Modules</h4>
            {modules.length ? <ul>{modules.map((module) => <li key={module}>{module}</li>)}</ul> : <p className="text-muted">Modules appear here after you create Bridge events and assign their modules.</p>}
            <p className="text-muted" style={{ margin: 0 }}>Tests and certificate templates below belong only to this Bridge; they do not change Global Settings.</p>
          </div>
        </div>

        <div className="report-tabs" aria-label="Bridge-specific settings">
          {sections.map(([key, label]) => (
            <button key={key} type="button" className={`report-tab ${section === key ? "active" : ""}`} onClick={() => setSection(key)}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: section === "pre_test" ? "block" : "none" }}>
          <GlobalPreAssessmentEditor initialData={preTest} bridgeId={bridgeId} />
        </div>
        <div style={{ display: section === "post_test" ? "block" : "none" }}>
          <GlobalSurveyEditor initialData={postTest} bridgeId={bridgeId} />
        </div>
        <div style={{ display: section === "participant_certificate" ? "block" : "none" }}>
          <GlobalCertificateEditor key={participantTemplate?.updated_at ?? `bridge-${bridgeId}-participant-default`} initialData={participantTemplate} recipientType="student" bridgeId={bridgeId} />
        </div>
        <div style={{ display: section === "speaker_certificate" ? "block" : "none" }}>
          <GlobalCertificateEditor key={speakerTemplate?.updated_at ?? `bridge-${bridgeId}-speaker-default`} initialData={speakerTemplate} recipientType="speaker" bridgeId={bridgeId} />
        </div>
      </section>
    </div>
  );
}
