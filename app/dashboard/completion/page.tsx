import { getSessionUser } from "@/lib/session";
import { buildCompletionRows } from "@/lib/completion";
import {
  DESIGNATIONS,
  formatCompletedAt,
} from "@/lib/registration-fields";
import Link from "next/link";
import { redirectSpeakerToPortal } from "@/lib/speaker-portal";
import { readDB } from "@/lib/db";
import { Bridge, Event, IssuedCertificate, IssuedSpeakerCertificate } from "@/lib/types";
import { classifyBridgeEvent, getBridgeForEvent } from "@/lib/bridge";
import IssuedCertificatesView from "../../../components/admin/IssuedCertificatesView";

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function dash(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default async function ModuleCompletionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  redirectSpeakerToPortal(user);
  const sp = await searchParams;

  if (sp.tab === "issued") {
    const allBridges = readDB<Bridge>("bridges");
    const mainEventIds = new Set(
      readDB<Event>("events")
        .filter((event) => !getBridgeForEvent(event, allBridges) && !classifyBridgeEvent(event))
        .map((event) => event.id)
    );
    const participants = readDB<IssuedCertificate>("issued_certificates")
      .filter((certificate) => mainEventIds.has(certificate.event_id))
      .sort((a, b) => b.issued_at.localeCompare(a.issued_at));
    const speakers = readDB<IssuedSpeakerCertificate>("issued_speaker_certificates")
      .filter((certificate) => mainEventIds.has(certificate.event_id))
      .sort((a, b) => b.issued_at.localeCompare(a.issued_at));

    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-title">Certificate Monitor</h1>
            <p className="text-muted">Issued certificates for main events, separate from Bridge certificates.</p>
          </div>
        </div>
        <div className="report-tabs">
          <Link href="/dashboard/certificates" className="report-tab">Completion Monitor</Link>
          <Link href="/dashboard/certificates?tab=issued" className="report-tab active">Issued Certificates</Link>
        </div>
        <IssuedCertificatesView participantCertificates={participants} speakerCertificates={speakers} />
      </div>
    );
  }

  const status = sp.status ?? "completed";
  const topic = sp.topic ?? "";
  const eventId = sp.event_id ?? "";
  const designation = sp.designation ?? "";
  const organization = sp.organization ?? "";
  const country = sp.country ?? "";
  const program = sp.program ?? "";
  const institution = sp.institution ?? "";
  const q = sp.q ?? "";
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const limit = sp.limit ?? "500";

  const {
    rows,
    total,
    events,
    topics,
    programs,
    designations,
    organizations,
    countries,
    institutions,
  } = buildCompletionRows({
    status,
    topic: topic || undefined,
    event_id: eventId || undefined,
    designation: designation || undefined,
    organization: organization || undefined,
    country: country || undefined,
    program: program || undefined,
    institution: institution || undefined,
    q: q || undefined,
    from: from || undefined,
    to: to || undefined,
    limit,
    organizer_id: user?.role === "organizer" ? user.id : undefined,
  });

  const eventsForTopic = topic
    ? events.filter((e) => (e.category || "General") === topic)
    : events;

  const designationOptions = uniqueMerge([...DESIGNATIONS], designations);
  const institutionOptions = institutions;

  const filterParams = {
    status,
    topic: topic || undefined,
    event_id: eventId || undefined,
    designation: designation || undefined,
    organization: organization || undefined,
    country: country || undefined,
    program: program || undefined,
    institution: institution || undefined,
    q: q || undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const exportHref = `/api/reports/export-completion${qs({
    ...filterParams,
    limit: "5000",
  })}`;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Certificate Monitor</h1>
          <p className="text-muted">
            Module completion by participant · {total} record
            {total !== 1 ? "s" : ""}
            {rows.length < total ? ` (showing ${rows.length})` : ""}
          </p>
        </div>
        <a href={exportHref} className="btn btn-secondary">
          Export CSV
        </a>
      </div>

      <div className="report-tabs">
        <Link href="/dashboard/certificates" className="report-tab active">Completion Monitor</Link>
        <Link href="/dashboard/certificates?tab=issued" className="report-tab">Issued Certificates</Link>
      </div>

      <form method="GET" className="completion-filters card">
        <div className="card-body">
          <div className="completion-filter-grid">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <select name="status" className="form-control" defaultValue={status}>
                <option value="completed">Completed</option>
                <option value="cert_ready">Certificate Ready</option>
                <option value="registered">Registered</option>
                <option value="waitlist">Waitlist</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Topic</label>
              <select name="topic" className="form-control" defaultValue={topic}>
                <option value="">— All modules —</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Webinar / Event</label>
              <select name="event_id" className="form-control" defaultValue={eventId}>
                <option value="">— All events —</option>
                {eventsForTopic
                  .slice()
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Designation</label>
              <select name="designation" className="form-control" defaultValue={designation}>
                <option value="">All designations</option>
                {designationOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Organization</label>
              <select name="organization" className="form-control" defaultValue={organization}>
                <option value="">All organizations</option>
                {organizations.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Country</label>
              <select name="country" className="form-control" defaultValue={country}>
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Program</label>
              <select name="program" className="form-control" defaultValue={program}>
                <option value="">All programs</option>
                {programs.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Institution</label>
              <select name="institution" className="form-control" defaultValue={institution}>
                <option value="">All institutions</option>
                {institutionOptions.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Show</label>
              <select name="limit" className="form-control" defaultValue={limit}>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Completed From</label>
              <input type="date" name="from" className="form-control" defaultValue={from} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Completed To</label>
              <input type="date" name="to" className="form-control" defaultValue={to} />
            </div>
          </div>

          <div className="completion-search-row">
            <input
              name="q"
              className="form-control"
              placeholder="name / email / topic / organization / country / staff id / designation / program"
              defaultValue={q}
            />
            <button type="submit" className="btn btn-primary">Filter</button>
            <Link href="/dashboard/completion" className="btn btn-secondary">Reset</Link>
          </div>
        </div>
      </form>

      <div className="completion-export-row">
        <a href={exportHref} className="btn btn-sm btn-secondary">Export CSV</a>
        <span className="text-muted" style={{ fontSize: ".8125rem" }}>
          {rows.length} row{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table completion-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Webinar/Seminar</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th className="num">Age</th>
                  <th>Country</th>
                  <th>Designation</th>
                  <th>Organization</th>
                  <th>Program</th>
                  <th>Institution</th>
                  <th>Staff ID</th>
                  <th>Completed At</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center text-muted" style={{ padding: "2.5rem" }}>
                      No registrations match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.topic}</td>
                      <td style={{ fontWeight: 600 }}>{r.eventTitle}</td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td style={{ fontSize: ".8125rem" }}>{r.email}</td>
                      <td className="num">{dash(r.age)}</td>
                      <td>{dash(r.country)}</td>
                      <td>{dash(r.designation)}</td>
                      <td>{dash(r.organization)}</td>
                      <td>{dash(r.program)}</td>
                      <td>{dash(r.institution)}</td>
                      <td style={{ fontSize: ".8125rem" }}>{dash(r.staffId)}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: ".8125rem" }}>
                        {formatCompletedAt(r.completedAt ?? r.registeredAt) || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function uniqueMerge(base: readonly string[], extra: string[]) {
  return [...new Set([...base, ...extra])].sort((a, b) => a.localeCompare(b));
}
