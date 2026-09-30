import Link from "next/link";
import { buildCompletionRows } from "@/lib/completion";
import { IssuedCertificate, IssuedSpeakerCertificate } from "@/lib/types";

function qs(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function BridgeCertificateMonitor({
  bridgeId,
  bridgeTitle,
  participantCertificates,
  speakerCertificates,
  searchParams,
}: {
  bridgeId: string;
  bridgeTitle: string;
  participantCertificates: IssuedCertificate[];
  speakerCertificates: IssuedSpeakerCertificate[];
  searchParams: Record<string, string>;
}) {
  const view = searchParams.view === "issued" ? "issued" : "monitor";
  const status = searchParams.status ?? "completed";
  const topic = searchParams.topic ?? "";
  const eventId = searchParams.event_id ?? "";
  const designation = searchParams.designation ?? "";
  const organization = searchParams.organization ?? "";
  const country = searchParams.country ?? "";
  const program = searchParams.program ?? "";
  const institution = searchParams.institution ?? "";
  const query = searchParams.q ?? "";
  const from = searchParams.from ?? "";
  const to = searchParams.to ?? "";
  const limit = searchParams.limit ?? "500";

  const monitor = view === "monitor" ? buildCompletionRows({
    bridge_id: bridgeId,
    status,
    topic: topic || undefined,
    event_id: eventId || undefined,
    designation: designation || undefined,
    organization: organization || undefined,
    country: country || undefined,
    program: program || undefined,
    institution: institution || undefined,
    q: query || undefined,
    from: from || undefined,
    to: to || undefined,
    limit,
  }) : null;

  const eventsForTopic = topic
    ? monitor?.events.filter((event) => (event.category || "General") === topic) ?? []
    : monitor?.events ?? [];
  const mainQuery = {
    status,
    topic: topic || undefined,
    event_id: eventId || undefined,
    designation: designation || undefined,
    organization: organization || undefined,
    country: country || undefined,
    program: program || undefined,
    institution: institution || undefined,
    q: query || undefined,
    from: from || undefined,
    to: to || undefined,
    limit,
  };
  const exportHref = `/api/reports/export-completion${qs({ ...mainQuery, bridge_id: bridgeId, limit: "5000" })}`;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h3 style={{ margin: "0 0 .25rem" }}>{bridgeTitle} · Cert Monitor</h3>
        <p className="text-muted" style={{ margin: 0 }}>Certificate readiness and issued certificates for this Bridge only.</p>
      </div>

      <div className="report-tabs">
        <Link href={`/dashboard/bridges/${bridgeId}?tab=certificates&view=monitor`} className={`report-tab ${view === "monitor" ? "active" : ""}`}>Completion Monitor</Link>
        <Link href={`/dashboard/bridges/${bridgeId}?tab=certificates&view=issued`} className={`report-tab ${view === "issued" ? "active" : ""}`}>Issued Certificates</Link>
      </div>

      {view === "monitor" && monitor && (
        <>
          <div className="completion-export-row">
            <a href={exportHref} className="btn btn-secondary btn-sm">Export Bridge CSV</a>
            <span className="text-muted">{monitor.total} record{monitor.total === 1 ? "" : "s"}</span>
          </div>
          <form method="GET" action={`/dashboard/bridges/${bridgeId}`} className="completion-filters card">
            <input type="hidden" name="tab" value="certificates" />
            <input type="hidden" name="view" value="monitor" />
            <div className="card-body">
              <div className="completion-filter-grid">
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Status</label><select name="status" className="form-control" defaultValue={status}><option value="completed">Attended</option><option value="cert_ready">Certificate Ready</option><option value="registered">Registered</option><option value="waitlist">Waitlist</option><option value="cancelled">Cancelled</option><option value="all">All</option></select></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Module</label><select name="topic" className="form-control" defaultValue={topic}><option value="">All modules</option>{monitor.topics.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div className="form-group" style={{ margin: 0, minWidth: 220 }}><label className="form-label">Seminar / Webinar</label><select name="event_id" className="form-control" defaultValue={eventId}><option value="">All Bridge events</option>{eventsForTopic.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Designation</label><select name="designation" className="form-control" defaultValue={designation}><option value="">All designations</option>{monitor.designations.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Organization</label><select name="organization" className="form-control" defaultValue={organization}><option value="">All organizations</option>{monitor.organizations.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Country</label><select name="country" className="form-control" defaultValue={country}><option value="">All countries</option>{monitor.countries.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Program</label><select name="program" className="form-control" defaultValue={program}><option value="">All programs</option>{monitor.programs.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Institution</label><select name="institution" className="form-control" defaultValue={institution}><option value="">All institutions</option>{monitor.institutions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Show</label><select name="limit" className="form-control" defaultValue={limit}><option value="100">100</option><option value="250">250</option><option value="500">500</option><option value="1000">1000</option></select></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">From</label><input type="date" name="from" className="form-control" defaultValue={from} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">To</label><input type="date" name="to" className="form-control" defaultValue={to} /></div>
              </div>
              <div className="completion-search-row">
                <input name="q" className="form-control" placeholder="Search participant, email, module, event, or institution" defaultValue={query} />
                <button type="submit" className="btn btn-primary">Filter</button>
                <Link href={`/dashboard/bridges/${bridgeId}?tab=certificates&view=monitor`} className="btn btn-secondary">Reset</Link>
              </div>
            </div>
          </form>
          <div className="card"><div className="admin-table-wrap"><table className="admin-table completion-table">
            <thead><tr><th>Module</th><th>Seminar / Webinar</th><th>Participant</th><th>Email</th><th>Institution</th><th>Status</th><th>Certificate</th></tr></thead>
            <tbody>{monitor.rows.length === 0 ? <tr><td colSpan={7} className="text-center text-muted">No Bridge participants match these filters.</td></tr> : monitor.rows.map((row) => {
              const certificate = participantCertificates.find((item) => item.event_id === row.eventId && item.participant_id === row.id);
              return <tr key={row.id}><td>{row.topic}</td><td>{row.eventTitle}</td><td>{row.name}</td><td>{row.email}</td><td>{row.institution || "—"}</td><td>{row.status === "attended" ? row.certReady ? "Certificate Ready" : "Completed · Requirements Pending" : row.status}</td><td>{certificate ? <Link className="btn btn-secondary btn-sm bridge-tab-action" href={`/dashboard/bridges/${bridgeId}/certificates/${certificate.id}?type=student`}>View / Download</Link> : row.certReady ? "Ready to issue" : "Not issued"}</td></tr>;
            })}</tbody>
          </table></div></div>
        </>
      )}

      {view === "issued" && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <section><h4>Participant Certificates</h4>{participantCertificates.length ? <div className="card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Participant</th><th>Event</th><th>Issued</th><th>Code</th><th>Actions</th></tr></thead><tbody>{participantCertificates.map((item) => <tr key={item.id}><td>{item.student_name}</td><td>{item.event_title}</td><td>{item.issued_at}</td><td>{item.verification_code}</td><td><Link className="btn btn-secondary btn-sm bridge-tab-action" href={`/dashboard/bridges/${bridgeId}/certificates/${item.id}?type=student`}>View / Download</Link></td></tr>)}</tbody></table></div></div> : <p className="text-muted">No participant certificates issued for this Bridge.</p>}</section>
          <section><h4>Speaker Certificates</h4>{speakerCertificates.length ? <div className="card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Speaker</th><th>Event</th><th>Issued</th><th>Code</th><th>Actions</th></tr></thead><tbody>{speakerCertificates.map((item) => <tr key={item.id}><td>{item.speaker_name}</td><td>{item.event_title}</td><td>{item.issued_at}</td><td>{item.verification_code}</td><td><Link className="btn btn-secondary btn-sm bridge-tab-action" href={`/dashboard/bridges/${bridgeId}/certificates/${item.id}?type=speaker`}>View / Download</Link></td></tr>)}</tbody></table></div></div> : <p className="text-muted">No speaker certificates issued for this Bridge.</p>}</section>
        </div>
      )}
    </div>
  );
}
