"use client";
import { useState } from "react";
import Link from "next/link";
import MyEventsQR from "./MyEventsQR";

export interface RegItem {
  id: string;
  status: string;
  registered_at: string;
  attendance_token: string;
  cancel_token: string;
  designation?: string;
  event: {
    id: string;
    title: string;
    description: string;
    event_type: string;
    platform_link: string;
    platform_name: string;
    location: string;
    speaker: string;
    event_date: string;
    start_time: string;
    end_time: string;
    status: string;
    category: string;
    bridge_name?: string | null;
    bridge_id?: string | null;
    registration_token: string;
  };
  surveyActive: boolean;
  surveyDone: boolean;
  preTestActive: boolean;
  preTestDone: boolean;
  quizActive: boolean;
  quizDone: boolean;
  quizPassed: boolean;
  quizScore: number | null;
  certEligible: boolean;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", weekday: "short" });
}
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ap}`;
}

function EventCard({ r }: { r: RegItem }) {
  const ev = r.event;
  const isWebinar = ev.event_type === "webinar";

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: ".875rem" }}>
      {/* Title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".75rem", marginBottom: ".5rem", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: "1.0625rem", color: "var(--dark)" }}>{ev.title}</div>
        <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
          {r.designation === "Speaker" && (
            <span className="badge badge-organizer">As Speaker</span>
          )}
          <span className={`badge badge-${r.status}`}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ fontSize: ".8125rem", color: "var(--gray-500)", marginBottom: ".375rem" }}>
        {formatDate(ev.event_date)} {formatTime(ev.start_time)} → {formatTime(ev.end_time)}
        &nbsp;&bull;&nbsp;
        <span style={{ color: isWebinar ? "var(--primary)" : "var(--gold-dark)", fontWeight: 600 }}>
          {isWebinar ? "Webinar" : "Seminar"}
        </span>
      </div>

      {ev.speaker && (
        <div style={{ fontSize: ".875rem", marginBottom: ".375rem" }}>
          <strong>Speaker:</strong> {ev.speaker}
        </div>
      )}

      {ev.description && (
        <div style={{ fontSize: ".875rem", color: "var(--gray-500)", marginBottom: ".875rem" }}>
          {ev.description.slice(0, 120)}{ev.description.length > 120 ? "…" : ""}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Platform / Attend */}
        {isWebinar && ev.platform_link && ["registered","attended"].includes(r.status) && (
          <a href={ev.platform_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
            {ev.platform_name || "Join"}
          </a>
        )}
        {!isWebinar && r.status === "registered" && r.attendance_token && (
          <MyEventsQR token={r.attendance_token} title={ev.title} />
        )}
        {isWebinar && r.status === "registered" && r.attendance_token && (
          <a href={`/api/attendance/confirm?token=${r.attendance_token}`} className="btn btn-gold btn-sm">
            Confirm Attendance
          </a>
        )}

        {/* Details */}
        <Link href={`/event/${ev.id}`} className="btn btn-secondary btn-sm">Details</Link>

        {r.preTestActive ? (
          r.preTestDone ? (
            <span className="btn btn-sm" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "1px solid #b8ddc8", cursor: "default" }}>Pre-test done</span>
          ) : (
            <Link href={`/pre-assessment/${ev.id}?participant_id=${r.id}`} className="btn btn-secondary btn-sm">Pre-test</Link>
          )
        ) : (
          <span className="btn btn-sm" style={{ background: "var(--gray-100)", color: "var(--gray-400)", border: "1px solid var(--border)", cursor: "not-allowed" }}>Pre-test (not configured)</span>
        )}

        {/* Quiz */}
        {r.quizActive ? (
          r.quizDone ? (
            <span className="btn btn-sm" style={{ background: r.quizPassed ? "var(--primary-light)" : "#fdf0ef", color: r.quizPassed ? "var(--primary)" : "var(--danger)", border: `1px solid ${r.quizPassed ? "#b8ddc8" : "#f0b8b4"}`, cursor: "default" }}>
              {r.quizPassed ? `Passed (${r.quizScore}%)` : `Failed (${r.quizScore}%)`}
            </span>
          ) : r.preTestActive && r.preTestDone && r.status === "attended" ? (
            <Link href={`/speaker/quiz/${ev.id}`} className="btn btn-secondary btn-sm">Quiz</Link>
          ) : (
            <span className="btn btn-sm" style={{ background: "var(--gray-100)", color: "var(--gray-400)", border: "1px solid var(--border)", cursor: "not-allowed" }}>Quiz (complete pre-test and attendance first)</span>
          )
        ) : (
          <span className="btn btn-sm" style={{ background: "var(--gray-100)", color: "var(--gray-400)", border: "1px solid var(--border)", cursor: "not-allowed" }}>Quiz (not configured)</span>
        )}

        {/* Post-test */}
        {r.surveyActive ? (
          r.surveyDone ? (
            <span className="btn btn-sm" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "1px solid #b8ddc8", cursor: "default" }}>Post-test done</span>
          ) : r.quizActive && r.quizDone ? (
            <Link href={`/speaker/survey/${ev.id}`} className="btn btn-secondary btn-sm">Post-test</Link>
          ) : (
            <span className="btn btn-sm" style={{ background: "var(--gray-100)", color: "var(--gray-400)", border: "1px solid var(--border)", cursor: "not-allowed" }}>Post-test (complete quiz first)</span>
          )
        ) : (
          <span className="btn btn-sm" style={{ background: "var(--gray-100)", color: "var(--gray-400)", border: "1px solid var(--border)", cursor: "not-allowed" }}>Post-test (not configured)</span>
        )}

        {/* Certificate */}
        {r.certEligible ? (
          <Link href={`/speaker/certificate/${ev.id}`} className="btn btn-sm"
            style={{ background: "linear-gradient(135deg,var(--gold),var(--gold-dark))", color: "var(--primary-dark)", fontWeight: 700, border: "none" }}>
            Download Certificate
          </Link>
        ) : (
          <span className="btn btn-sm" style={{ background: "var(--gray-100)", color: "var(--gray-400)", border: "1px solid var(--border)", cursor: "not-allowed" }}
            title="Complete attendance, pre-test, quiz, and post-test to unlock">
            Certificate (locked)
          </span>
        )}

        {/* Cancel */}
        {["registered","waitlist"].includes(r.status) && ["upcoming","ongoing"].includes(ev.status) && (
          <Link href={`/cancel/${r.cancel_token}`} className="btn btn-danger btn-sm">Cancel</Link>
        )}
      </div>
    </div>
  );
}

export default function CategoryAccordion({ groups }: { groups: { category: string; items: RegItem[] }[] }) {
  // All categories open by default
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.category, true]))
  );

  function toggle(cat: string) {
    setOpen((o) => ({ ...o, [cat]: !o[cat] }));
  }

  if (groups.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
      {groups.map((g) => (
        <div key={g.category}>
          {/* Category header — accordion trigger */}
          <button
            type="button"
            onClick={() => toggle(g.category)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".75rem 1.125rem", background: "var(--primary-light)", border: "1px solid #b8ddc8", borderRadius: open[g.category] ? "var(--radius-lg) var(--radius-lg) 0 0" : "var(--radius-lg)", cursor: "pointer", transition: "all .2s" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--primary-dark)" }}>{g.category}</span>
              <span style={{ background: "var(--primary)", color: "white", borderRadius: "2rem", padding: ".1rem .55rem", fontSize: ".75rem", fontWeight: 700, minWidth: 22, textAlign: "center" }}>
                {g.items.length}
              </span>
            </div>
            <span style={{ color: "var(--primary)", fontSize: "1.125rem", transition: "transform .2s", transform: open[g.category] ? "rotate(0deg)" : "rotate(180deg)", display: "inline-block" }}>
              ∧
            </span>
          </button>

          {/* Collapsible content */}
          {open[g.category] && (
            <div style={{ border: "1px solid #b8ddc8", borderTop: "none", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)", padding: "1rem", background: "var(--surface-alt)" }}>
              {g.items.map((r) => <EventCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
