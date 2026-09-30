import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import {
  Event,
  Participant,
  Quiz,
  QuizAttempt,
  SurveyResponse,
  AssessmentResponse,
  IssuedCertificate,
} from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import CategoryAccordion, { RegItem } from "./CategoryAccordion";
import { getPostTestForEvent, getPreTestForEvent } from "@/lib/bridge-settings";

export default async function MyEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard");
  if (user.role === "organizer") redirect("/speaker/my-events");

  const sp = await searchParams;
  const filterStatus = sp.filter ?? "all";

  const allEvents = readDB<Event>("events");
  const events = allEvents.map((event) => ({
    ...event,
    status: computeEventStatus(event),
  }));
  if (events.some((event, index) => event.status !== allEvents[index].status)) {
    writeDB("events", events);
  }

  const myRegsAll = readDB<Participant>("participants").filter(
    (p) => p.email.toLowerCase() === user.email.toLowerCase()
  );

  const counts = {
    all: myRegsAll.length,
    registered: myRegsAll.filter((p) => p.status === "registered").length,
    attended: myRegsAll.filter((p) => p.status === "attended").length,
    waitlist: myRegsAll.filter((p) => p.status === "waitlist").length,
    cancelled: myRegsAll.filter((p) => p.status === "cancelled").length,
  };

  const myRegs = [...myRegsAll].sort((a, b) =>
    a.event_id.localeCompare(b.event_id)
  );

  const quizzes = readDB<Quiz>("quizzes");
  const preTestResponses = readDB<AssessmentResponse>("assessment_responses");
  const surveyResponses = readDB<SurveyResponse>("survey_responses");
  const quizAttempts = readDB<QuizAttempt>("quiz_attempts");
  const issuedCertificates = readDB<IssuedCertificate>("issued_certificates");

  const allRegs: RegItem[] = myRegs
    .map((r) => {
      const ev = events.find((e) => e.id === r.event_id);
      if (!ev) return null;
      if (filterStatus !== "all" && r.status !== filterStatus) return null;

      const quiz = quizzes.find((q) => q.event_id === ev.id);
      const preTestActive = !!getPreTestForEvent(ev.id);
      const preTestDone = preTestResponses.some(
        (response) => response.event_id === ev.id && response.participant_id === r.id
      );
      const postTest = getPostTestForEvent(ev.id);
      const surveyActive = !!postTest?.is_active && (postTest.questions ?? []).some((q) => q.question.trim());
      const surveyDone = !!surveyResponses.find(
        (sr) => sr.event_id === ev.id && sr.participant_id === r.id
      );
      const quizAttempt = quizAttempts.find(
        (a) => a.event_id === ev.id && a.participant_id === r.id
      );
      const quizActive = quiz?.is_active ?? false;
      const quizDone = !!quizAttempt;
      const quizPassed = quizAttempt?.passed ?? false;
      const alreadyIssued = issuedCertificates.some(
        (certificate) => certificate.event_id === ev.id && certificate.participant_id === r.id
      );
      const certEligible = alreadyIssued || (
        r.status === "attended" && preTestActive && preTestDone &&
        surveyActive && surveyDone && quizActive && quizPassed
      );

      return {
        id: r.id,
        status: r.status,
        registered_at: r.registered_at,
        attendance_token: r.attendance_token,
        cancel_token: r.cancel_token,
        designation: r.designation || "",
        event: {
          id: ev.id,
          title: ev.title,
          description: ev.description,
          event_type: ev.event_type,
          platform_link: ev.platform_link,
          platform_name: ev.platform_name,
          location: ev.location,
          speaker: ev.speaker,
          event_date: ev.event_date,
          start_time: ev.start_time,
          end_time: ev.end_time,
          status: ev.status,
          category: ev.category,
          bridge_name: ev.bridge_name ?? null,
          bridge_id: ev.bridge_id ?? null,
          registration_token: ev.registration_token,
        },
        surveyActive,
        surveyDone,
        preTestActive,
        preTestDone,
        quizActive,
        quizDone,
        quizPassed,
        quizScore: quizAttempt?.score ?? null,
        certEligible,
      } satisfies RegItem;
    })
    .filter(Boolean) as RegItem[];

  const categoryMap = new Map<string, RegItem[]>();
  allRegs.forEach((r) => {
    const label =
      (r.event.bridge_name && r.event.bridge_name.trim()) ||
      r.event.category ||
      "General";
    if (!categoryMap.has(label)) categoryMap.set(label, []);
    categoryMap.get(label)!.push(r);
  });

  const groups = [...categoryMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) =>
        a.event.event_date.localeCompare(b.event.event_date)
      ),
    }));

  const filters = [
    { key: "all", label: "All", count: counts.all },
    { key: "registered", label: "Registered", count: counts.registered },
    { key: "attended", label: "Attended", count: counts.attended },
    { key: "waitlist", label: "Waitlist", count: counts.waitlist },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div>
          <h2>My Registrations</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            {counts.all === 0
              ? "Events you join as a participant"
              : `${counts.all} registration${counts.all !== 1 ? "s" : ""}${
                  groups.length > 1 ? ` · ${groups.length} groups` : ""
                }`}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Link href="/student/browse" className="btn btn-gold">
            Browse Events
          </Link>
        </div>
      </div>

      {sp.cancelled && (
        <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
          Your registration has been cancelled.
        </div>
      )}
      {sp.survey && (
        <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
          Survey submitted. Thank you for your feedback.
        </div>
      )}

      <div
        className="filter-bar"
        style={{
          marginBottom: "1.25rem",
          display: "flex",
          flexWrap: "wrap",
          gap: ".5rem",
          padding: ".75rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/student/my-events?filter=${f.key}`}
            className={`btn btn-sm ${
              filterStatus === f.key ? "btn-primary" : "btn-secondary"
            }`}
          >
            {f.label}
            <span
              style={{
                marginLeft: ".35rem",
                opacity: filterStatus === f.key ? 0.9 : 0.55,
                fontWeight: 700,
              }}
            >
              {f.count}
            </span>
          </Link>
        ))}
      </div>

      {allRegs.length === 0 ? (
        <div className="card">
          <div
            className="card-body"
            style={{
              padding: "2rem 1.5rem",
              textAlign: "center",
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            <h3 style={{ margin: "0 0 .5rem", fontSize: "1.15rem" }}>
              {filterStatus === "all"
                ? "No registrations yet"
                : `No ${filterStatus} registrations`}
            </h3>
            <p
              className="text-muted"
              style={{ margin: "0 0 1.25rem", fontSize: ".9rem" }}
            >
              {filterStatus === "all"
                ? "Browse upcoming events and register to see them here."
                : "Try another filter, or browse events to register."}
            </p>
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/student/browse" className="btn btn-gold">
                Browse Events
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <CategoryAccordion groups={groups} />
      )}
    </div>
  );
}
