import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne } from "@/lib/db";
import { AssessmentResponse, Event, IssuedCertificate, Participant, Quiz, QuizAttempt, SurveyResponse } from "@/lib/types";
import { issueCertificate, getEventCertificateTemplate } from "@/lib/certificates";
import CertificateCanvas from "./CertificateCanvas";
import Link from "next/link";
import { headers } from "next/headers";
import { getPostTestForEvent, getPreTestForEvent } from "@/lib/bridge-settings";

export default async function CertificatePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event) notFound();

  const participant = findOne<Participant>("participants",
    (p) => p.event_id === eventId && p.email.toLowerCase() === user.email.toLowerCase() && p.status !== "cancelled"
  );
  if (!participant) notFound();

  const effectiveTemplate = getEventCertificateTemplate(eventId, "student");

  const preTest = getPreTestForEvent(eventId);
  const survey = getPostTestForEvent(eventId);
  const surveyActive =
    !!survey?.is_active &&
    (survey.questions ?? []).some((q) => q.question.trim() !== "");
  const quiz = findOne<Quiz>("quizzes", (q) => q.event_id === eventId);

  const preTestDone = !!preTest && !!findOne<AssessmentResponse>("assessment_responses",
    (r) => r.event_id === eventId && r.participant_id === participant.id
  );
  const surveyDone = surveyActive && !!findOne<SurveyResponse>("survey_responses",
    (r) => r.event_id === eventId && r.participant_id === participant.id
  );
  const quizPassed = !!quiz?.is_active && !!findOne<QuizAttempt>("quiz_attempts",
    (a) => a.event_id === eventId && a.participant_id === participant.id && a.passed
  );
  const attended = participant.status === "attended";
  const existingCertificate = findOne<IssuedCertificate>("issued_certificates", (certificate) => certificate.event_id === eventId && certificate.participant_id === participant.id);
  const eligible = !!existingCertificate || (attended && preTestDone && surveyDone && quizPassed);

  let issued = existingCertificate;
  let verifyUrl = "";
  if (!issued && eligible && effectiveTemplate) {
    issued = issueCertificate(participant, event);
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    verifyUrl = `${proto}://${host}/verify/${issued.verification_code}`;
  }

  return (
    <>
      <div className="container" style={{ maxWidth: 860, padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: ".375rem" }}>Official CvSU Certificate</h2>
            <p className="text-muted">{event.title}</p>
          </div>
          <Link href="/speaker/my-events" className="btn btn-secondary">Back</Link>
        </div>

        {!eligible ? (
          <div className="card">
            <div className="card-body empty-state">
              <h3 style={{ marginBottom: "1rem" }}>Certificate Not Yet Available</h3>
              <p className="text-muted" style={{ marginBottom: "1.5rem" }}>Complete the following to unlock your university-certified certificate:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", maxWidth: 360, margin: "0 auto 2rem" }}>
                {[
                  { done: attended, label: "Attend the event", configured: true },
                  { done: preTestDone, label: "Complete the pre-test", configured: !!preTest },
                  { done: quizPassed, label: "Pass the quiz", configured: !!quiz?.is_active },
                  { done: surveyDone, label: "Complete the post-test", configured: surveyActive },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".75rem 1rem", borderRadius: "var(--radius)", background: item.done ? "var(--primary-light)" : "var(--gray-100)", border: `1px solid ${item.done ? "#b8ddc8" : "var(--border)"}` }}>
                    <span className={`req-status ${!item.configured ? "req-inactive" : item.done ? "req-done" : "req-pending"}`}>
                      {!item.configured ? "Unavailable" : item.done ? "Done" : "Pending"}
                    </span>
                    <span style={{ fontWeight: 600, color: item.done ? "var(--primary-dark)" : !item.configured ? "var(--gray-400)" : "var(--dark)" }}>
                      {item.label} {!item.configured ? "(not configured)" : ""}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/speaker/my-events" className="btn btn-gold">Go to My Events</Link>
            </div>
          </div>
        ) : !effectiveTemplate ? (
          <div className="card">
            <div className="card-body text-center" style={{ padding: "3rem" }}>
              <h3>Certificate Template Not Set</h3>
              <p className="text-muted" style={{ margin: "1rem 0 2rem" }}>
                The speaker hasn&apos;t configured the certificate template yet. Please check back later.
              </p>
              <Link href="/speaker/my-events" className="btn btn-gold">Back to My Events</Link>
            </div>
          </div>
        ) : issued ? (
          <CertificateCanvas
            template={effectiveTemplate}
            studentName={participant.full_name}
            eventTitle={event.title}
            eventDate={event.event_date}
            speaker={event.speaker}
            verificationCode={issued.verification_code}
            verifyUrl={verifyUrl}
          />
        ) : null}
      </div>
    </>
  );
}
