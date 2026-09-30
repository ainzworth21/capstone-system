import { readDB, getUniversalSurvey } from "@/lib/db";
import { PreAssessment, Pubmat } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import GlobalPreAssessmentEditor from "./GlobalPreAssessmentEditor";
import GlobalSurveyEditor from "./GlobalSurveyEditor";
import GlobalCertificateTabs from "./GlobalCertificateTabs";
import GlobalPubmatEditor from "./GlobalPubmatEditor";
import GlobalCategoriesEditor from "./GlobalCategoriesEditor";
import { getUniversalCertificateTemplate } from "@/lib/certificates";

export default async function GlobalSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const tab = sp.tab ?? "pre-assessment";
  const certTab = sp.cert === "speaker" ? "speaker" : "student";

  const allAssessments = readDB<PreAssessment>("pre_assessments");
  const universalAssessment =
    allAssessments.find((a) => a.event_id === "universal") ?? null;
  const universalSurvey = getUniversalSurvey();
  const studentCert = getUniversalCertificateTemplate("student");
  const speakerCert = getUniversalCertificateTemplate("speaker");
  const pubmats = readDB<Pubmat>("pubmats").sort(
    (a, b) =>
      a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
  );
  const categories = readDB<string>("categories").sort();

  const tabs = [
    { key: "pre-assessment", label: "Pre-test" },
    { key: "survey", label: "Post-test" },
    { key: "certificate", label: "Certificate" },
    { key: "pubmat", label: "Announcement" },
    { key: "categories", label: "Modules" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Global Settings</h2>
          <p className="text-muted">
            Configure universal forms, certificates, announcements, and event
            categories.
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {tab === "pre-assessment" && (
            <a
              href="/dashboard/settings/preview/pre-assessment"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Preview Pre-test
            </a>
          )}
          {tab === "survey" && (
            <a
              href="/dashboard/settings/preview/survey"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Preview Post-test
            </a>
          )}
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
        <span>
          <strong>Pre-test</strong> and <strong>Post-test</strong> apply to
          all events. <strong>Certificates</strong> — student and speaker
          designs. <strong>Announcement</strong> — landing page posters.{" "}
          <strong>Modules</strong> — topic groupings for events and speakers.{" "}
          <strong>Quizzes</strong> are per event under Manage Event.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: ".5rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          borderBottom: "2px solid var(--border)",
          paddingBottom: ".875rem",
        }}
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/settings?tab=${t.key}`}
            className={`btn btn-sm ${tab === t.key ? "btn-gold" : "btn-secondary"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "pre-assessment" && (
        <GlobalPreAssessmentEditor initialData={universalAssessment} />
      )}
      {tab === "survey" && (
        <GlobalSurveyEditor initialData={universalSurvey} />
      )}
      {tab === "certificate" && (
        <GlobalCertificateTabs
          studentTemplate={studentCert}
          speakerTemplate={speakerCert}
          initialTab={certTab}
        />
      )}
      {tab === "pubmat" && <GlobalPubmatEditor initialItems={pubmats} />}
      {tab === "categories" && (
        <GlobalCategoriesEditor initialCategories={categories} />
      )}
    </div>
  );
}
