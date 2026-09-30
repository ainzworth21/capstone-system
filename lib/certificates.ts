import { readDB, insertOne, findOne, readJsonFile } from "./db";
import {
  IssuedCertificate,
  IssuedSpeakerCertificate,
  Participant,
  Event,
  User,
  CertificateTemplate,
  Bridge,
} from "./types";
import { generateId, now } from "./utils";
import { composeFullName } from "./registration-fields";
import { createNotification } from "./notifications";
import { writeAuditLog } from "./audit";
import { getBridgeForEvent } from "./bridge";
import { getBridgeSettings } from "./bridge-settings";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function randomBlock(len = 4): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

function codeExists(code: string): boolean {
  const student = findOne<IssuedCertificate>(
    "issued_certificates",
    (c) => c.verification_code.toUpperCase() === code.toUpperCase()
  );
  if (student) return true;
  const speaker = findOne<IssuedSpeakerCertificate>(
    "issued_speaker_certificates",
    (c) => c.verification_code.toUpperCase() === code.toUpperCase()
  );
  return !!speaker;
}

/** Human-readable CvSU verification code, unique across student + speaker certs */
export function generateVerificationCode(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  let code = "";
  do {
    code = `CVSU-${year}${randomBlock(2)}-${randomBlock(4)}`;
  } while (codeExists(code));
  return code;
}

/**
 * Issue a university certificate for a participant+event (idempotent).
 * Returns the existing record if already issued.
 */
export function issueCertificate(
  participant: Participant,
  event: Event
): IssuedCertificate {
  const existing = findOne<IssuedCertificate>(
    "issued_certificates",
    (c) => c.event_id === event.id && c.participant_id === participant.id
  );
  if (existing) return existing;

  const record: IssuedCertificate = {
    id: generateId(),
    verification_code: generateVerificationCode(),
    event_id: event.id,
    participant_id: participant.id,
    student_name: composeFullName(participant) || participant.full_name,
    student_id: participant.student_id,
    student_email: participant.email,
    course: participant.course,
    year_level: participant.year_level,
    event_title: event.title,
    event_date: event.event_date,
    speaker: event.speaker ?? "",
    issued_at: now(),
  };

  insertOne("issued_certificates", record);

  const account = findOne<User>(
    "users",
    (u) => u.email.toLowerCase() === participant.email.toLowerCase()
  );
  if (account) {
    createNotification({
      user_id: account.id,
      type: "certificate_issued",
      title: "Certificate available",
      body: `Your certificate for "${event.title}" is ready.`,
      link:
        account.role === "organizer"
          ? `/speaker/certificate/${event.id}`
          : `/student/certificate/${event.id}`,
    });
  }

  writeAuditLog({
    action: "certificate_issue",
    actor_id: null,
    actor_email: participant.email,
    actor_role: "participant",
    target_type: "certificate",
    target_id: record.id,
    summary: `Issued participant certificate for "${event.title}"`,
    meta: {
      event_id: event.id,
      participant_id: participant.id,
      verification_code: record.verification_code,
    },
  });

  return record;
}

/**
 * Issue a Certificate of Appreciation for a registered speaker (idempotent).
 */
export function issueSpeakerCertificate(
  speaker: User,
  event: Event
): IssuedSpeakerCertificate {
  const existing = findOne<IssuedSpeakerCertificate>(
    "issued_speaker_certificates",
    (c) => c.event_id === event.id && c.speaker_user_id === speaker.id
  );
  if (existing) return existing;

  const record: IssuedSpeakerCertificate = {
    id: generateId(),
    verification_code: generateVerificationCode(),
    event_id: event.id,
    speaker_user_id: speaker.id,
    speaker_name: speaker.full_name,
    speaker_email: speaker.email,
    title_position: speaker.title_position ?? "",
    affiliation: speaker.affiliation ?? "",
    event_title: event.title,
    event_date: event.event_date,
    issued_at: now(),
  };

  insertOne("issued_speaker_certificates", record);

  createNotification({
    user_id: speaker.id,
    type: "certificate_issued",
    title: "Speaker certificate available",
    body: `Your Certificate of Appreciation for "${event.title}" is ready.`,
    link: `/speaker/certificate/${event.id}`,
  });

  writeAuditLog({
    action: "speaker_certificate_issue",
    actor_id: speaker.id,
    actor_email: speaker.email,
    actor_role: "organizer",
    target_type: "speaker_certificate",
    target_id: record.id,
    summary: `Issued speaker certificate for "${event.title}"`,
    meta: {
      event_id: event.id,
      verification_code: record.verification_code,
    },
  });

  return record;
}

export function findCertificateByCode(
  code: string
):
  | { type: "student"; cert: IssuedCertificate }
  | { type: "speaker"; cert: IssuedSpeakerCertificate }
  | null {
  const normalized = code.trim().toUpperCase();
  const student = findOne<IssuedCertificate>(
    "issued_certificates",
    (c) => c.verification_code.toUpperCase() === normalized
  );
  if (student) return { type: "student", cert: student };
  const speaker = findOne<IssuedSpeakerCertificate>(
    "issued_speaker_certificates",
    (c) => c.verification_code.toUpperCase() === normalized
  );
  if (speaker) return { type: "speaker", cert: speaker };
  return null;
}

export function listIssuedCertificates(): IssuedCertificate[] {
  return readDB<IssuedCertificate>("issued_certificates").sort((a, b) =>
    b.issued_at.localeCompare(a.issued_at)
  );
}

export function listIssuedSpeakerCertificates(): IssuedSpeakerCertificate[] {
  return readDB<IssuedSpeakerCertificate>("issued_speaker_certificates").sort(
    (a, b) => b.issued_at.localeCompare(a.issued_at)
  );
}

export function getUniversalCertificateTemplate(
  recipientType: "student" | "speaker" = "student"
): CertificateTemplate | null {
  const file =
    recipientType === "speaker"
      ? "universal_speaker_certificate.json"
      : "universal_certificate.json";
  return readJsonFile<CertificateTemplate>(file);
}

/** Event-specific template if set; otherwise the global Settings template. */
export function getEventCertificateTemplate(
  eventId: string,
  recipientType: "student" | "speaker" = "student"
): CertificateTemplate | null {
  const event = findOne<Event>("events", (item) => item.id === eventId);
  const bridge = event
    ? getBridgeForEvent(event, readDB<Bridge>("bridges"))
    : null;
  if (bridge) {
    const settings = getBridgeSettings(bridge.id);
    const template = recipientType === "speaker"
      ? settings?.speaker_certificate
      : settings?.participant_certificate;
    if (!template) return null;
    return {
      ...template,
      event_id: eventId,
      recipient_type: recipientType,
    };
  }

  const templates = readDB<CertificateTemplate>("certificate_templates");
  const eventTemplate = templates.find(
    (t) =>
      t.event_id === eventId &&
      (t.recipient_type ?? "student") === recipientType
  );
  return eventTemplate ?? getUniversalCertificateTemplate(recipientType);
}
