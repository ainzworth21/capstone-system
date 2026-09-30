import { buildCompletionRows } from "./completion";
import { isEventHost } from "./authz";

export interface InboundCvsuFilters {
  bridge_id?: string;
  topic?: string;
  event_id?: string;
  organizer_id?: string;
  q?: string;
  from?: string;
  to?: string;
  /** Exact total attended count; omit for all */
  attended?: string;
}

export interface InboundCompletedEvent {
  eventId: string;
  title: string;
  eventDate: string;
  startTime: string;
  completedAt: string;
  displayLabel: string;
}

export interface InboundCvsuStudent {
  email: string;
  fullName: string;
  program: string;
  totalAttended: number;
  completedEvents: InboundCompletedEvent[];
}

export interface AttendanceBreakdown {
  attendedCount: number;
  studentCount: number;
}

export interface InboundCvsuReport {
  totalStudents: number;
  totalEvents: number;
  attendanceBreakdown: AttendanceBreakdown[];
  students: InboundCvsuStudent[];
  maxAttended: number;
  generatedAt: string;
}

function isCvsuStudent(
  institution: string,
  organization: string,
  email: string
): boolean {
  const inst = institution.toLowerCase();
  const org = organization.toLowerCase();
  const em = email.toLowerCase();
  return (
    inst.includes("cvsu") ||
    org.includes("cvsu") ||
    org.includes("cavite state") ||
    em.endsWith("@cvsu.edu.ph")
  );
}

function formatEventLabel(
  title: string,
  eventDate: string,
  startTime: string
): string {
  const time = startTime?.trim() || "00:00";
  const d = new Date(`${eventDate}T${time}`);
  if (Number.isNaN(d.getTime())) {
    return `${title} (${eventDate})`;
  }
  const formatted = d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${title} (${formatted})`;
}

export function buildInboundCvsuReport(
  filters: InboundCvsuFilters = {}
): InboundCvsuReport {
  const { rows, events } = buildCompletionRows({
    status: "completed",
    bridge_id: filters.bridge_id,
    topic: filters.topic,
    event_id: filters.event_id,
    organizer_id: filters.organizer_id,
    from: filters.from,
    to: filters.to,
    limit: "50000",
  });

  const eventMap = new Map(events.map((e) => [e.id, e]));

  const cvsuRows = rows.filter(
    (r) =>
      r.designation?.trim().toLowerCase() !== "speaker" &&
      isCvsuStudent(r.institution, r.organization, r.email)
  );

  const byEmail = new Map<
    string,
    {
      email: string;
      fullName: string;
      program: string;
      events: InboundCompletedEvent[];
    }
  >();

  for (const r of cvsuRows) {
    const ev = eventMap.get(r.eventId);
    if (!ev) continue;

    const key = r.email.toLowerCase().trim();
    if (!byEmail.has(key)) {
      byEmail.set(key, {
        email: r.email,
        fullName: r.name,
        program: r.program,
        events: [],
      });
    }

    const student = byEmail.get(key)!;
    if (r.program && !student.program) student.program = r.program;
    if (r.name.length > student.fullName.length) student.fullName = r.name;

    if (!student.events.some((e) => e.eventId === r.eventId)) {
      student.events.push({
        eventId: r.eventId,
        title: ev.title,
        eventDate: ev.event_date,
        startTime: ev.start_time,
        completedAt: r.completedAt ?? r.registeredAt,
        displayLabel: formatEventLabel(ev.title, ev.event_date, ev.start_time),
      });
    }
  }

  let students: InboundCvsuStudent[] = [...byEmail.values()].map((s) => {
    const completedEvents = s.events.sort((a, b) => {
      const da = `${a.eventDate}T${a.startTime}`;
      const db = `${b.eventDate}T${b.startTime}`;
      return da.localeCompare(db);
    });
    return {
      email: s.email,
      fullName: s.fullName,
      program: s.program,
      totalAttended: completedEvents.length,
      completedEvents,
    };
  });

  if (filters.q) {
    const q = filters.q.toLowerCase().trim();
    students = students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.program.toLowerCase().includes(q)
    );
  }

  students.sort((a, b) => a.fullName.localeCompare(b.fullName));

  const breakdownMap = new Map<number, number>();
  for (const s of students) {
    breakdownMap.set(
      s.totalAttended,
      (breakdownMap.get(s.totalAttended) ?? 0) + 1
    );
  }

  const attendanceBreakdown = [...breakdownMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([attendedCount, studentCount]) => ({ attendedCount, studentCount }));

  const maxAttended = students.reduce(
    (m, s) => Math.max(m, s.totalAttended),
    0
  );

  const summaryStudentCount = students.length;
  const summaryEventIds = new Set<string>();
  for (const s of students) {
    for (const e of s.completedEvents) summaryEventIds.add(e.eventId);
  }

  let scopedEvents = events;
  if (filters.organizer_id) {
    const hostId = filters.organizer_id;
    scopedEvents = scopedEvents.filter((e) => isEventHost(e, hostId));
  }
  if (filters.topic) {
    scopedEvents = scopedEvents.filter(
      (e) => (e.category || "General") === filters.topic
    );
  }
  if (filters.event_id) {
    scopedEvents = scopedEvents.filter((e) => e.id === filters.event_id);
  }
  const totalProgramEvents =
    filters.event_id ? 1 : scopedEvents.length;

  if (filters.attended) {
    const n = Number(filters.attended);
    if (!Number.isNaN(n)) {
      students = students.filter((s) => s.totalAttended === n);
    }
  }

  return {
    totalStudents: summaryStudentCount,
    totalEvents: filters.event_id
      ? summaryEventIds.has(filters.event_id)
        ? 1
        : 0
      : Math.max(totalProgramEvents, summaryEventIds.size),
    attendanceBreakdown,
    students,
    maxAttended,
    generatedAt: new Date().toISOString(),
  };
}

export function inboundCvsuCsv(report: InboundCvsuReport): string {
  const headers = [
    "Full Name",
    "Email",
    "Program",
    "Total Attended",
    "Completed Webinars/Seminars",
  ];
  const rows = report.students.map((s) => [
    s.fullName,
    s.email,
    s.program,
    String(s.totalAttended),
    s.completedEvents.map((e) => e.displayLabel).join("; "),
  ]);
  return [headers, ...rows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}
