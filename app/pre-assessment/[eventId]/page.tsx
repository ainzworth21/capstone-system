import { notFound, redirect } from "next/navigation";
import { findOne } from "@/lib/db";
import { Event, Participant, AssessmentResponse } from "@/lib/types";
import Navbar from "@/components/Navbar";
import { getSessionUser } from "@/lib/session";
import PreAssessmentForm from "./PreAssessmentForm";
import { getPreTestForEvent } from "@/lib/bridge-settings";

export default async function PreAssessmentPage({ params, searchParams }: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { eventId } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();

  const event = findOne<Event>("events", (e) => e.id === eventId);
  if (!event || event.status === "cancelled") notFound();

  const participantId = sp.participant_id;
  if (!participantId) {
    redirect(`/register/${event.registration_token}`);
  }

  const participant = findOne<Participant>("participants", (p) => p.id === participantId);
  if (!participant || participant.event_id !== eventId) notFound();

  const existing = findOne<AssessmentResponse>("assessment_responses",
    (r) => r.event_id === eventId && r.participant_id === participantId
  );
  if (existing) {
    redirect(`/confirmation?pid=${participantId}`);
  }

  const assessment = getPreTestForEvent(eventId);
  if (!assessment) {
    redirect(`/confirmation?pid=${participantId}`);
  }

  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 680, padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: "1.25rem", fontSize: ".875rem", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "white", fontWeight: 800, fontSize: ".875rem" }}>1</span>
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>Registration</span>
            <span style={{ color: "var(--gray-300)" }}>/</span>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--gold)", color: "var(--primary-dark)", fontWeight: 800, fontSize: ".875rem" }}>2</span>
            <span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>Pre-Assessment</span>
            <span style={{ color: "var(--gray-300)" }}>/</span>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--gray-200)", color: "var(--gray-500)", fontWeight: 800, fontSize: ".875rem" }}>3</span>
            <span style={{ color: "var(--gray-500)" }}>Confirmation</span>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: ".375rem" }}>Pre-Assessment</h2>
          <p className="text-muted">{event.title}</p>
          <div className="alert alert-info" style={{ marginTop: "1rem" }}>
            <span>
              Please answer all 5 questions after registering.
              Responses appear as <strong>Pre Q1–Q5</strong> in Reporting.
            </span>
          </div>
        </div>

        <PreAssessmentForm
          assessment={assessment}
          eventId={eventId}
          participantId={participantId}
        />
      </div>
      <footer className="footer"><p>© {new Date().getFullYear()} CvSU Campus Event Management System</p></footer>
    </>
  );
}
