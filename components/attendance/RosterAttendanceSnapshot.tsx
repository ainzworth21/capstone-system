import Link from "next/link";

export default function RosterAttendanceSnapshot({
  counts,
  attendanceHref,
}: {
  counts: {
    registered: number;
    attended: number;
    waitlist: number;
    cancelled?: number;
  };
  attendanceHref: string;
}) {
  const cards: { key: string; label: string; value: number; hint: string }[] = [
    {
      key: "registered",
      label: "Registered",
      value: counts.registered,
      hint: "Awaiting check-in",
    },
    {
      key: "attended",
      label: "Attended",
      value: counts.attended,
      hint: "Checked in",
    },
    {
      key: "waitlist",
      label: "Waitlist",
      value: counts.waitlist,
      hint: "Capacity overflow",
    },
  ];

  return (
    <div className="roster-snapshot">
      <div className="roster-snapshot-cards">
        {cards.map((c) => (
          <div key={c.key} className={`roster-snapshot-card roster-snapshot-card--${c.key}`}>
            <div className="roster-snapshot-value">{c.value}</div>
            <div className="roster-snapshot-label">{c.label}</div>
            <div className="roster-snapshot-hint">{c.hint}</div>
          </div>
        ))}
      </div>
      <div className="roster-snapshot-cta">
        <Link href={attendanceHref} className="btn btn-gold">
          Open attendance tool
        </Link>
        {typeof counts.cancelled === "number" && (
          <span className="text-muted" style={{ fontSize: ".8125rem" }}>
            Cancelled: {counts.cancelled}
          </span>
        )}
      </div>
    </div>
  );
}
