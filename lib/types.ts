export interface Pubmat {
  id: string;
  title: string;
  caption: string;
  image_filename: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Role = "admin" | "organizer" | "student";
export type AccountStatus = "pending" | "approved" | "rejected";
export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type EventType = "webinar" | "seminar";
export type ParticipantStatus = "registered" | "attended" | "cancelled" | "waitlist";

export interface User {
  id: string;
  full_name: string;
  name_prefix?: string | null;
  first_name?: string | null;
  middle_initial?: string | null;
  last_name?: string | null;
  name_suffix?: string | null;
  email: string;
  password: string;
  role: Role;
  account_status: AccountStatus;
  student_id: string | null;
  course: string | null;
  year_level: number | null;
  /** Participant designation e.g. Student, Faculty, Staff */
  designation?: string | null;
  /** Speaker ID photo filename under /public/speaker-ids/ */
  id_image: string | null;
  /** Speaker profile — title / position e.g. Professor, Dr., Engr. */
  title_position: string | null;
  /** Speaker affiliation e.g. CvSU, UiTM */
  affiliation: string | null;
  /** Short speaker bio */
  bio: string | null;
  /** Whether speaker is listed as active */
  speaker_active: boolean;
  /** When true, user must set a new password after login (admin temp reset). */
  must_change_password?: boolean;
  /**
   * Invited speakers may change login email this many times (usually 1).
   * Omitted / 0 = cannot change email (admin-owned identity).
   */
  email_changes_remaining?: number;
  created_at: string;
}

/** One-time password reset token (demo: link shown in-app instead of email). */
export interface PasswordReset {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

/** One-time speaker magic-link login token. */
export interface SpeakerLoginToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_type: EventType;          // "webinar" | "seminar"
  location: string;               // physical venue — used when event_type === "seminar"
  platform_link: string;          // meeting URL — used when event_type === "webinar"
  platform_name: string;          // e.g. "Zoom", "Google Meet", "MS Teams"
  speaker: string;                // speaker / resource person display name(s)
  /** Lead / primary linked speaker (first of speaker_ids); null for legacy free-text only */
  speaker_id: string | null;
  /** All assigned resource speakers (organizer user ids). Prefer this over speaker_id alone. */
  speaker_ids?: string[];
  event_date: string;             // "YYYY-MM-DD"
  start_time: string;             // "HH:MM"
  end_time: string;               // "HH:MM"
  capacity: number;
  status: EventStatus;
  registration_token: string;
  organizer_id: string;
  organizer_name?: string;
  banner_image: string | null;
  category: string;
  bridge_name?: string | null;
  bridge_id?: string | null;
  created_at: string;
}

export interface Bridge {
  id: string;
  title: string;
  partner_name: string;
  is_active?: boolean;
  created_at: string;
}

export type BridgeCertificateSettings = Omit<
  CertificateTemplate,
  "event_id" | "recipient_type"
>;

export interface BridgeSettings {
  bridge_id: string;
  pre_test: PreAssessment | null;
  post_test: Survey | null;
  participant_certificate: BridgeCertificateSettings | null;
  speaker_certificate: BridgeCertificateSettings | null;
  updated_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  /** Display name (composed from parts; kept for legacy records) */
  full_name: string;
  name_prefix?: string;
  first_name?: string;
  middle_initial?: string;
  last_name?: string;
  name_suffix?: string;
  student_id: string;
  email: string;
  course: string;
  year_level: number;
  age: number | null;
  organization: string;
  designation: string;
  country: string;
  /** Partner / home institution (free text, e.g. CvSU, UiTM) */
  institution: string;
  registered_at: string;
  status: ParticipantStatus;
  attendance_token: string;
  cancel_token: string;
}

export interface AttendanceLog {
  id: string;
  participant_id: string;
  event_id: string;
  scanned_at: string;
  method: "qr" | "manual";
}

export interface Feedback {
  id: string;
  event_id: string;
  participant_id: string;
  rating: number;
  comment: string;
  feedback_token: string;
  submitted_at: string | null;
}

// Session user shape
export interface SessionUser {
  id: string;
  full_name: string;
  name_prefix?: string | null;
  first_name?: string | null;
  middle_initial?: string | null;
  last_name?: string | null;
  name_suffix?: string | null;
  email: string;
  role: Role;
  account_status: AccountStatus;
  student_id: string | null;
  course: string | null;
  year_level: number | null;
  designation?: string | null;
  /** Set after admin issues a temporary password. */
  must_change_password?: boolean;
  /** Remaining one-time email changes (invited speakers). */
  email_changes_remaining?: number;
}

// ── Pre-Assessment ────────────────────────────────────────────
export interface AssessmentQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "short_answer" | "rating";
  options?: string[];   // for multiple_choice and rating (e.g. 5–1)
}

export interface PreAssessment {
  id: string;
  event_id: string;
  questions: AssessmentQuestion[];
  created_at: string;
}

export interface AssessmentResponse {
  id: string;
  event_id: string;
  participant_id: string;
  answers: Record<string, string>;  // question_id → answer
  submitted_at: string;
}

// ── Survey ───────────────────────────────────────────────────
export interface SurveyQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "rating" | "short_answer";
  options?: string[];
}

export interface Survey {
  id: string;
  event_id: string;
  is_active: boolean;
  questions: SurveyQuestion[];
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  event_id: string;
  participant_id: string;
  answers: Record<string, string>;
  submitted_at: string;
}

// ── Quiz ─────────────────────────────────────────────────────
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  points: number;
}

export interface Quiz {
  id: string;
  event_id: string;
  is_active: boolean;
  passing_score: number;   // percentage 0-100
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  event_id: string;
  participant_id: string;
  answers: Record<string, string>;
  score: number;         // percentage
  passed: boolean;
  submitted_at: string;
}

// ── Certificate ───────────────────────────────────────────────
export interface CertificateTemplate {
  id: string;
  event_id: string;
  /** "student" = participation; "speaker" = appreciation */
  recipient_type: "student" | "speaker";
  image_filename: string | null;  // uploaded background image
  name_x: number;                 // percentage from left (0-100)
  name_y: number;                 // percentage from top (0-100)
  name_font_size: number;         // px
  name_color: string;             // hex color
  name_font: string;              // font family
  created_at: string;
  updated_at: string;
}

/** Official university-issued certificate — unique per student + event */
export interface IssuedCertificate {
  id: string;
  verification_code: string;   // public code e.g. CVSU-A1B2-C3D4
  event_id: string;
  participant_id: string;
  student_name: string;
  student_id: string;
  student_email: string;
  course: string;
  year_level: number;
  event_title: string;
  event_date: string;
  speaker: string;
  issued_at: string;
}

/** Certificate of Appreciation issued to a registered speaker for an event */
export interface IssuedSpeakerCertificate {
  id: string;
  verification_code: string;
  event_id: string;
  speaker_user_id: string;
  speaker_name: string;
  speaker_email: string;
  title_position: string;
  affiliation: string;
  event_title: string;
  event_date: string;
  issued_at: string;
}

/** In-app notification (no email required) */
export type NotificationType =
  | "speaker_approved"
  | "event_created"
  | "certificate_issued";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Append-only admin audit trail */
export type AuditAction =
  | "user_delete"
  | "speaker_status"
  | "admin_password_reset"
  | "backup_download"
  | "certificate_issue"
  | "speaker_certificate_issue"
  | "speaker_invite"
  | "speaker_email_change";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  target_type: string | null;
  target_id: string | null;
  summary: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}
