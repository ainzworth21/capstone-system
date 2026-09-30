const FEATURES = [
  {
    title: "QR Attendance",
    desc: "Contactless attendance tracking at seminar venues via unique participant QR codes.",
  },
  {
    title: "Shareable Links",
    desc: "One registration link per event — students sign up without extra steps.",
  },
  {
    title: "Live Reports",
    desc: "Real-time completion, survey, and quiz data for administrators and speakers.",
  },
  {
    title: "Feedback System",
    desc: "Structured pre- and post-evaluation aligned with CvSU reporting requirements.",
  },
] as const;

export default function EnterpriseFeatures() {
  return (
    <section className="section section-alt">
      <div className="container">
        <div className="section-header">
          <h2>Platform Capabilities</h2>
          <p className="text-muted">
            Built for CvSU campus events — webinars, seminars, and certificate workflows.
          </p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="feature-card">
              <span className="feature-card-index">{String(i + 1).padStart(2, "0")}</span>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
