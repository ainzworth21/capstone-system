import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne, readDB } from "@/lib/db";
import { Bridge, Event, IssuedCertificate, IssuedSpeakerCertificate, Participant } from "@/lib/types";
import { redirect } from "next/navigation";
import { getEventsForBridge } from "@/lib/bridge";
import BridgeActivationButton from "../BridgeActivationButton";
import { getBridgeSettings } from "@/lib/bridge-settings";
import BridgeSettingsEditor from "../BridgeSettingsEditor";
import BridgeCertificateMonitor from "../BridgeCertificateMonitor";
import BridgeEvaluationMonitor from "../BridgeEvaluationMonitor";
import BridgeReportsPanel from "../BridgeReportsPanel";

const tabs = [
  ["events", "All Events"],
  ["certificates", "Cert Monitor"],
  ["evaluations", "Evaluations"],
  ["settings", "Bridge Settings"],
  ["reports", "Reports"],
] as const;

type WorkspaceTab = (typeof tabs)[number][0];

export default async function BridgeWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ bridgeId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/dashboard");
  const { bridgeId } = await params;
  const sp = await searchParams;
  const bridge = findOne<Bridge>("bridges", (item) => item.id === bridgeId);
  if (!bridge) notFound();

  const tab = (tabs.some(([key]) => key === sp.tab) ? sp.tab : "events") as WorkspaceTab;
  const allBridges = readDB<Bridge>("bridges");
  const events = getEventsForBridge(readDB<Event>("events"), bridge, allBridges)
    .sort((a, b) => `${a.event_date}T${a.start_time}`.localeCompare(`${b.event_date}T${b.start_time}`));
  const eventIds = new Set(events.map((event) => event.id));
  const participants = readDB<Participant>("participants").filter((item) => eventIds.has(item.event_id));
  const certificates = readDB<IssuedCertificate>("issued_certificates").filter((item) => eventIds.has(item.event_id));
  const speakerCertificates = readDB<IssuedSpeakerCertificate>("issued_speaker_certificates").filter((item) => eventIds.has(item.event_id));
  const bridgeSettings = getBridgeSettings(bridge.id) ?? {
    bridge_id: bridge.id,
    pre_test: null,
    post_test: null,
    participant_certificate: null,
    speaker_certificate: null,
    updated_at: "",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <p style={{ margin: "0 0 .25rem", color: "var(--gold-dark)", fontWeight: 700 }}>Bridge workspace</p>
          <h2>{bridge.title}</h2>
          <p className="text-muted" style={{ margin: 0 }}>{bridge.partner_name}</p>
          <span className={`badge ${bridge.is_active === false ? "badge-cancelled" : "badge-approved"}`} style={{ marginTop: ".5rem" }}>
            {bridge.is_active === false ? "Off · Archived" : "On · Open for registration"}
          </span>
        </div>
        <div className="bridge-workspace-actions">
          <BridgeActivationButton bridgeId={bridge.id} isActive={bridge.is_active !== false} />
          <Link href="/dashboard/bridges" className="btn btn-secondary">All Bridges</Link>
        </div>
      </div>

      <nav className="report-tabs" aria-label="Bridge administration">
        {tabs.map(([key, label]) => (
          <Link key={key} href={`/dashboard/bridges/${bridge.id}?tab=${key}`} className={`report-tab ${tab === key ? "active" : ""}`}>
            {label}
          </Link>
        ))}
        {bridge.is_active !== false && <Link href={`/dashboard/bridges/${bridge.id}/events/create`} className="report-tab bridge-create-tab">Create Event</Link>}
      </nav>

      {tab === "events" && (
        <section>
          {bridge.is_active === false && (
            <div className="alert alert-warning" style={{ marginBottom: "1rem" }}>
              This Bridge is archived, so new events and registrations are closed. Turn it on to create seminars or webinars.
            </div>
          )}
          <div className="completion-export-row bridge-event-toolbar">
            <span className="text-muted">{events.length} bridge event{events.length === 1 ? "" : "s"}</span>
            {bridge.is_active !== false && <Link href={`/dashboard/bridges/${bridge.id}/events/create`} className="btn btn-gold btn-sm bridge-create-action">Create Seminar / Webinar</Link>}
          </div>
          {events.length === 0 ? <div className="card"><div className="card-body text-muted">No events have been added to this bridge yet.</div></div> : (
            <div className="card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Event</th><th>Module</th><th>Type</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {events.map((event) => <tr key={event.id}><td>{event.title}</td><td>{event.category || "General"}</td><td>{event.event_type === "webinar" ? "Webinar" : "Seminar"}</td><td>{event.event_date}</td><td>{event.status}</td><td><Link href={`/dashboard/events/${event.id}/manage`} className="btn btn-secondary btn-sm bridge-manage-action">Manage</Link></td></tr>)}
            </tbody></table></div></div>
          )}
        </section>
      )}

      {tab === "certificates" && (
        <BridgeCertificateMonitor
          bridgeId={bridge.id}
          bridgeTitle={bridge.title}
          participantCertificates={certificates}
          speakerCertificates={speakerCertificates}
          searchParams={sp}
        />
      )}

      {tab === "evaluations" && (
        <BridgeEvaluationMonitor
          bridgeId={bridge.id}
          events={events}
          participants={participants}
          searchParams={sp}
        />
      )}

      {tab === "settings" && (
        <BridgeSettingsEditor
          bridgeId={bridge.id}
          bridgeTitle={bridge.title}
          initialSettings={bridgeSettings}
          modules={[...new Set(events.map((event) => event.category || "General"))].sort((a, b) => a.localeCompare(b))}
        />
      )}

      {tab === "reports" && (
        <BridgeReportsPanel bridgeId={bridge.id} bridgeTitle={bridge.title} events={events} searchParams={sp} />
      )}
    </div>
  );
}
