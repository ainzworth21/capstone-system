import { InboundCvsuReport } from "@/lib/inbound-cvsu";

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function InboundCvsuReportView({ report }: { report: InboundCvsuReport }) {
  return (
    <div className="inbound-cvsu-report">
      <p className="inbound-generated-at">
        Generated on {formatGeneratedAt(report.generatedAt)}
      </p>

      <div className="inbound-kpi-row">
        <div className="inbound-kpi">
          <div className="inbound-kpi-value">{report.totalStudents}</div>
          <div className="inbound-kpi-label">Total Students</div>
        </div>
        <div className="inbound-kpi">
          <div className="inbound-kpi-value">{report.totalEvents}</div>
          <div className="inbound-kpi-label">Total Webinars/Seminars</div>
        </div>
      </div>

      {report.attendanceBreakdown.length > 0 && (
        <div className="inbound-attendance-section">
          <h3 className="inbound-section-title">Students by Attendance</h3>
          <div className="inbound-attendance-pills">
            {report.attendanceBreakdown.map((b) => (
              <span key={b.attendedCount} className="inbound-attendance-pill">
                {b.attendedCount} webinar/seminar{b.attendedCount !== 1 ? "s" : ""}: <strong>{b.studentCount}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table inbound-cvsu-table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Program</th>
                  <th className="num">Total Attended</th>
                  <th>Completed Webinars/Seminars (Title + Date)</th>
                </tr>
              </thead>
              <tbody>
                {report.students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: "2.5rem" }}>
                      No CvSU students found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  report.students.map((s, i) => (
                    <tr key={s.email}>
                      <td className="num">{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                      <td style={{ fontSize: ".8125rem" }}>{s.email}</td>
                      <td>{s.program || "—"}</td>
                      <td className="num">
                        <span className="inbound-attended-badge">{s.totalAttended}</span>
                      </td>
                      <td>
                        <div className="inbound-event-pills">
                          {s.completedEvents.map((e) => (
                            <span key={`${s.email}-${e.eventId}`} className="inbound-event-pill">
                              {e.displayLabel}
                            </span>
                          ))}
                        </div>
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
