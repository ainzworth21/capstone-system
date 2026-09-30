"use client";
import { useState } from "react";
import Link from "next/link";

function formatRange(date: string, start: string, end: string) {
  const fmt = (t: string) => {
    const d = new Date(`${date}T${t}:00`);
    return d.toLocaleString("en-PH", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(",", "");
  };
  return { start: fmt(start), end: fmt(end) };
}

function buildBody(
  event: {
    title: string;
    event_type: string;
    event_date: string;
    start_time: string;
    end_time: string;
    platform_link: string;
    location: string;
  },
  moreInfo: string
) {
  const range = formatRange(event.event_date, event.start_time, event.end_time);
  const place =
    event.event_type === "webinar"
      ? `Join  : ${event.platform_link || "(no join link set)"}`
      : `Venue : ${event.location || "(no venue set)"}`;

  return `Hi,

Here are the updated details for the ${event.event_type === "webinar" ? "Webinar" : "Seminar"}:

Title : ${event.title}
Start : ${range.start} (Asia/Manila)
End   : ${range.end} (Asia/Manila)
${place}
More info: ${moreInfo}
`;
}

export default function EmailParticipantsForm({
  event,
  recipientCount,
  moreInfoUrl,
}: {
  event: {
    id: string;
    title: string;
    event_type: string;
    event_date: string;
    start_time: string;
    end_time: string;
    platform_link: string;
    location: string;
  };
  recipientCount: number;
  moreInfoUrl: string;
}) {
  const [batchSize, setBatchSize] = useState(75);
  const [delayMs, setDelayMs] = useState(50);
  const [subject, setSubject] = useState(`[Update] ${event.title}`);
  const [body, setBody] = useState(() => buildBody(event, moreInfoUrl));
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function startSending(e: React.FormEvent) {
    e.preventDefault();
    if (recipientCount === 0) {
      alert("No participants to email.");
      return;
    }
    if (!confirm(`Send email to ${recipientCount} participant(s)?`)) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, Math.min(1500, delayMs * 10)));
    setSending(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="card-body text-center" style={{ padding: "2.5rem" }}>
          <h2 style={{ marginBottom: ".5rem" }}>Emails queued</h2>
          <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
            {recipientCount} recipient(s) · batch size {batchSize} · delay {delayMs}ms
          </p>
          <p className="text-muted" style={{ fontSize: ".875rem", marginBottom: "1.5rem" }}>
            Note: This demo stores data in JSON files and does not connect to an SMTP server.
          </p>
          <Link href="/dashboard/events" className="btn btn-primary">Back to Events</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Email participants — {event.title}</h1>
        </div>
        <Link href="/dashboard/events" className="btn btn-secondary btn-sm">Back</Link>
      </div>

      <form onSubmit={startSending} className="card">
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Batch size</label>
              <input type="number" className="form-control" min={1} value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Delay per email (ms)</label>
              <input type="number" className="form-control" min={0} value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Total recipients</label>
              <input className="form-control" value={recipientCount} readOnly />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Plain text body</label>
            <textarea
              className="form-control"
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              style={{ fontFamily: "ui-monospace, monospace", fontSize: ".875rem" }}
            />
          </div>

          <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
            <Link href="/dashboard/events" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? "Sending…" : "Start Sending"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
