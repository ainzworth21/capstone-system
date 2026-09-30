import { notFound, redirect } from "next/navigation";
import { findOne, getUniversalSurvey, readDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Bridge, Event, Quiz, IssuedSpeakerCertificate, User } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import { canManageEvent } from "@/lib/authz";
import {
  eventSpeakerIds,
  speakerDisplayName,
} from "@/lib/speaker-registration";
import Link from "next/link";
import SurveyEditor from "./SurveyEditor";
import QuizEditor from "./QuizEditor";
import CertificateManageTabs from "./CertificateManageTabs";
import { getBridgeForEvent } from "@/lib/bridge";

export default async function ManageEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user || user.role === "student") redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "details";

  const event = findOne<Event>("events", (e) => e.id === id);
  if (!event) notFound();
  if (!canManageEvent(user, event)) notFound();

  const ev = { ...event, status: computeEventStatus(event) };
  const isAdmin = user.role === "admin";
  const bridge = getBridgeForEvent(event, readDB<Bridge>("bridges"));

  const universalSurvey = bridge ? null : getUniversalSurvey();
  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === id);
  const speakerIds = eventSpeakerIds(event);
  const allIssued = readDB<IssuedSpeakerCertificate>(
    "issued_speaker_certificates"
  ).filter((c) => c.event_id === id);
  const speakerCertTargets = speakerIds.map((sid) => {
    const u = findOne<User>("users", (x) => x.id === sid);
    return {
      id: sid,
      name: u ? speakerDisplayName(u) : ev.speaker || "Speaker",
      issued: allIssued.find((c) => c.speaker_user_id === sid) ?? null,
    };
  });

  const tabs = [
    { key: "details", label: "Details" },
    ...(isAdmin && !bridge
      ? [
          {
            key: "survey",
            label: "Survey",
            badge: universalSurvey?.is_active ? "active" : "off",
          },
        ]
      : []),
    {
      key: "quiz",
      label: "Quiz",
      badge: quiz?.is_active ? "active" : "off",
    },
    ...(isAdmin ? [{ key: "certificate", label: "Certificate" }] : []),
  ];

  // Speakers only get Details + Quiz (no survey / certificate)
  let activeTab = tab;
  if (!isAdmin && (tab === "survey" || tab === "certificate")) {
    activeTab = "details";
  }
  if (bridge && tab === "survey") activeTab = "details";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Manage Event</h2>
          <p className="text-muted">{ev.title}</p>
        </div>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <Link
            href={`/dashboard/questions?type=quiz&event_id=${id}`}
            className="btn btn-gold"
          >
            Edit Quiz
          </Link>
          <Link href={`/dashboard/events/${id}/edit`} className="btn btn-secondary">
            Edit Details
          </Link>
          <Link
            href={`/dashboard/participants?event_id=${id}`}
            className="btn btn-secondary"
          >
            Participants
          </Link>
          <Link href="/dashboard/events" className="btn btn-secondary">
            Back
          </Link>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
        <span>
          {isAdmin && bridge ? (
            <>This is a Bridge event. Configure its pre-test, post-test, and certificates in{" "}
              <Link href={`/dashboard/bridges/${bridge.id}?tab=settings`} style={{ fontWeight: 700, color: "var(--primary)" }}>Bridge Settings</Link>. The quiz is specific to this event.</>
          ) : isAdmin ? (
            <>
              Pre-Assessment is in{" "}
              <Link
                href="/dashboard/settings"
                style={{ fontWeight: 700, color: "var(--primary)" }}
              >
                Global Settings
              </Link>
              . Survey is global; Quiz is specific to this event.
            </>
          ) : (
            <>
              Use the <strong>Quiz</strong> tab to create or edit questions for
              this event. You can also use <strong>Edit Quiz</strong> for the
              quick question editor.
            </>
          )}
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
            href={`/dashboard/events/${id}/manage?tab=${t.key}`}
            className={`btn btn-sm ${activeTab === t.key ? "btn-gold" : "btn-secondary"}`}
            style={{ position: "relative" }}
          >
            {t.label}
            {"badge" in t && t.badge && (
              <span
                style={{
                  marginLeft: ".375rem",
                  fontSize: ".65rem",
                  padding: ".1rem .4rem",
                  borderRadius: "2rem",
                  background:
                    t.badge === "active" ? "var(--primary)" : "var(--gray-400)",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                {t.badge === "active" ? "ON" : "OFF"}
              </span>
            )}
          </Link>
        ))}
      </div>

      {activeTab === "details" && (
        <div className="card">
          <div
            className="card-body"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.25rem",
            }}
          >
            {(
              [
                [
                  "Type",
                  ev.event_type === "webinar" ? "Webinar" : "Seminar",
                ],
                [
                  "Status",
                  ev.status.charAt(0).toUpperCase() + ev.status.slice(1),
                ],
                ["Date", ev.event_date],
                ["Time", `${ev.start_time} — ${ev.end_time}`],
                ["Speaker", ev.speaker || "—"],
                ["Category", ev.category],
                ["Capacity", String(ev.capacity)],
                ev.event_type === "webinar"
                  ? ["Platform", `${ev.platform_name}`]
                  : ["Venue", ev.location],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: ".8rem",
                    color: "var(--gray-500)",
                    marginBottom: ".2rem",
                  }}
                >
                  {label}
                </div>
                <div style={{ fontWeight: 600 }}>{value}</div>
              </div>
            ))}
            {ev.event_type === "webinar" && ev.platform_link && (
              <div style={{ gridColumn: "1/-1" }}>
                <div
                  style={{
                    fontSize: ".8rem",
                    color: "var(--gray-500)",
                    marginBottom: ".2rem",
                  }}
                >
                  Meeting Link
                </div>
                <a
                  href={ev.platform_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)", fontWeight: 600 }}
                >
                  {ev.platform_link}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "survey" && isAdmin && (
        <SurveyEditor initialData={universalSurvey} />
      )}
      {activeTab === "quiz" && (
        <QuizEditor eventId={id} initialData={quiz ?? null} />
      )}
      {activeTab === "certificate" && isAdmin && (
        <CertificateManageTabs eventId={id} speakers={speakerCertTargets} bridgeId={bridge?.id} />
      )}
    </div>
  );
}
