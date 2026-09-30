import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { readDB } from "@/lib/db";
import { getEventCertificateTemplate } from "@/lib/certificates";
import { classifyBridgeEvent, getBridgeForEvent } from "@/lib/bridge";
import { Bridge, Event, IssuedCertificate, IssuedSpeakerCertificate } from "@/lib/types";
import StudentCertificateCanvas from "@/app/student/certificate/[eventId]/CertificateCanvas";
import SpeakerCertificateCanvas from "@/app/speaker/certificate/[eventId]/CertificateCanvas";
import { getSessionUser } from "@/lib/session";

export default async function MainEventCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ certificateId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

  const { certificateId } = await params;
  const query = await searchParams;
  const recipientType = query.type === "speaker" ? "speaker" : "student";
  const bridges = readDB<Bridge>("bridges");
  const mainEvents = readDB<Event>("events").filter(
    (event) => !getBridgeForEvent(event, bridges) && !classifyBridgeEvent(event)
  );
  const mainEventIds = new Set(mainEvents.map((event) => event.id));

  const participantCertificate = recipientType === "student"
    ? readDB<IssuedCertificate>("issued_certificates").find((item) => item.id === certificateId && mainEventIds.has(item.event_id))
    : undefined;
  const speakerCertificate = recipientType === "speaker"
    ? readDB<IssuedSpeakerCertificate>("issued_speaker_certificates").find((item) => item.id === certificateId && mainEventIds.has(item.event_id))
    : undefined;
  const certificate = participantCertificate ?? speakerCertificate;
  if (!certificate) notFound();

  const event = mainEvents.find((item) => item.id === certificate.event_id);
  if (!event) notFound();
  const template = getEventCertificateTemplate(event.id, recipientType);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const verifyUrl = `${protocol}://${host}/verify/${certificate.verification_code}`;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="text-muted" style={{ margin: "0 0 .25rem" }}>{event.title}</p>
          <h1 className="admin-title">{recipientType === "speaker" ? "Speaker Certificate" : "Participant Certificate"}</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            {participantCertificate?.student_name ?? speakerCertificate?.speaker_name} · {certificate.verification_code}
          </p>
        </div>
        <Link href="/dashboard/certificates?tab=issued" className="btn btn-secondary">Back to Issued Certificates</Link>
      </div>

      {!template ? (
        <div className="alert alert-error">No certificate template is configured for this recipient type.</div>
      ) : participantCertificate ? (
        <StudentCertificateCanvas
          template={template}
          studentName={participantCertificate.student_name}
          eventTitle={participantCertificate.event_title}
          eventDate={participantCertificate.event_date}
          speaker={participantCertificate.speaker}
          verificationCode={participantCertificate.verification_code}
          verifyUrl={verifyUrl}
        />
      ) : speakerCertificate ? (
        <SpeakerCertificateCanvas
          template={template}
          studentName={speakerCertificate.speaker_name}
          eventTitle={speakerCertificate.event_title}
          eventDate={speakerCertificate.event_date}
          speaker=""
          verificationCode={speakerCertificate.verification_code}
          verifyUrl={verifyUrl}
        />
      ) : null}
    </div>
  );
}
