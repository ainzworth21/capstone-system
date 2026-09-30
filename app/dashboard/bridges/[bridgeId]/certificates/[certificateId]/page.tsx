import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { findOne, readDB } from "@/lib/db";
import { getEventCertificateTemplate } from "@/lib/certificates";
import { getEventsForBridge } from "@/lib/bridge";
import { Bridge, Event, IssuedCertificate, IssuedSpeakerCertificate } from "@/lib/types";
import StudentCertificateCanvas from "@/app/student/certificate/[eventId]/CertificateCanvas";
import SpeakerCertificateCanvas from "@/app/speaker/certificate/[eventId]/CertificateCanvas";
import { getSessionUser } from "@/lib/session";

export default async function BridgeCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ bridgeId: string; certificateId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

  const { bridgeId, certificateId } = await params;
  const query = await searchParams;
  const recipientType = query.type === "speaker" ? "speaker" : "student";
  const bridge = findOne<Bridge>("bridges", (item) => item.id === bridgeId);
  if (!bridge) notFound();

  const bridges = readDB<Bridge>("bridges");
  const events = getEventsForBridge(readDB<Event>("events"), bridge, bridges);
  const eventIds = new Set(events.map((event) => event.id));

  const studentCertificate = recipientType === "student"
    ? readDB<IssuedCertificate>("issued_certificates").find((item) => item.id === certificateId && eventIds.has(item.event_id))
    : undefined;
  const speakerCertificate = recipientType === "speaker"
    ? readDB<IssuedSpeakerCertificate>("issued_speaker_certificates").find((item) => item.id === certificateId && eventIds.has(item.event_id))
    : undefined;
  const certificate = studentCertificate ?? speakerCertificate;
  if (!certificate) notFound();

  const event = events.find((item) => item.id === certificate.event_id);
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
          <p className="text-muted" style={{ margin: "0 0 .25rem" }}>{bridge.title} · {event.title}</p>
          <h1 className="admin-title">{recipientType === "speaker" ? "Speaker Certificate" : "Participant Certificate"}</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            {studentCertificate?.student_name ?? speakerCertificate?.speaker_name} · {certificate.verification_code}
          </p>
        </div>
        <Link href={`/dashboard/bridges/${bridge.id}?tab=certificates`} className="btn btn-secondary">Back to Bridge Certificates</Link>
      </div>

      {!template ? (
        <div className="alert alert-error">No certificate template is configured for this recipient type.</div>
      ) : studentCertificate ? (
        <StudentCertificateCanvas
          template={template}
          studentName={studentCertificate.student_name}
          eventTitle={studentCertificate.event_title}
          eventDate={studentCertificate.event_date}
          speaker={studentCertificate.speaker}
          verificationCode={studentCertificate.verification_code}
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
