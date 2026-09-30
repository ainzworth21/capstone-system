import Link from "next/link";
import { findCertificateByCode } from "@/lib/certificates";
import { formatDate } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import { getSessionUser } from "@/lib/session";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getSessionUser();
  const result = findCertificateByCode(decodeURIComponent(code));

  const rows =
    result?.type === "student"
      ? [
          ["Recipient type", "Student (Participation)"],
          ["Recipient", result.cert.student_name],
          ["Student ID", result.cert.student_id],
          ["Course", `${result.cert.course} · Year ${result.cert.year_level}`],
          ["Event / Module", result.cert.event_title],
          ["Event Date", formatDate(result.cert.event_date)],
          ["Speaker", result.cert.speaker || "—"],
          [
            "Issued On",
            new Date(result.cert.issued_at).toLocaleString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          ],
        ]
      : result?.type === "speaker"
        ? [
            ["Recipient type", "Speaker (Appreciation)"],
            ["Recipient", result.cert.speaker_name],
            ["Email", result.cert.speaker_email],
            ["Title / Position", result.cert.title_position || "—"],
            ["Affiliation", result.cert.affiliation || "—"],
            ["Event / Module", result.cert.event_title],
            ["Event Date", formatDate(result.cert.event_date)],
            [
              "Issued On",
              new Date(result.cert.issued_at).toLocaleString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            ],
          ]
        : [];

  const verificationCode =
    result?.type === "student"
      ? result.cert.verification_code
      : result?.type === "speaker"
        ? result.cert.verification_code
        : null;

  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 640, padding: "2.5rem 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto 1rem",
              borderRadius: "50%",
              background: result
                ? "linear-gradient(135deg, var(--primary), var(--primary-mid))"
                : "linear-gradient(135deg, #8b1a1a, #c0392b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              color: "var(--gold)",
              border: "3px solid var(--gold)",
            }}
          >
            {result ? "OK" : "—"}
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: ".35rem" }}>
            {result ? "Certificate Verified" : "Certificate Not Found"}
          </h1>
          <p className="text-muted">
            {result
              ? "This is an official digital certificate issued by Cavite State University."
              : "No matching university certificate was found for this code."}
          </p>
        </div>

        {result && verificationCode ? (
          <div className="card card-gold">
            <div className="card-body">
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "1.5rem",
                  paddingBottom: "1.25rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: ".7rem",
                    fontWeight: 700,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: "var(--gold-dark)",
                  }}
                >
                  Verification Code
                </div>
                <div
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    color: "var(--primary-dark)",
                    letterSpacing: ".06em",
                    marginTop: ".25rem",
                  }}
                >
                  {verificationCode}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    marginTop: ".75rem",
                    background: "var(--primary-light)",
                    color: "var(--primary-dark)",
                    padding: ".3rem .75rem",
                    borderRadius: "2rem",
                    fontSize: ".75rem",
                    fontWeight: 800,
                    border: "1px solid #b8ddc8",
                  }}
                >
                  AUTHENTIC · CVSU ISSUED ·{" "}
                  {result.type === "speaker" ? "SPEAKER" : "STUDENT"}
                </div>
              </div>

              <div style={{ display: "grid", gap: "1rem" }}>
                {rows.map(([label, value]) => (
                  <div
                    key={label}
                    style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: ".75rem" }}
                  >
                    <div
                      style={{
                        fontSize: ".8rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        color: "var(--gray-500)",
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--dark)" }}>{value}</div>
                  </div>
                ))}
              </div>

              <p
                style={{
                  marginTop: "1.5rem",
                  fontSize: ".8125rem",
                  color: "var(--gray-500)",
                  textAlign: "center",
                }}
              >
                This record is bound to the recipient above and cannot be
                transferred. If details do not match the printed certificate,
                treat it as invalid.
              </p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body text-center" style={{ padding: "2rem" }}>
              <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
                Checked code:{" "}
                <strong style={{ fontFamily: "ui-monospace, monospace" }}>{code}</strong>
              </p>
              <p
                style={{
                  fontSize: ".875rem",
                  color: "var(--gray-500)",
                  marginBottom: "1.5rem",
                }}
              >
                Double-check the code on the certificate, or ask the recipient to
                re-download their official certificate.
              </p>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link href="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
      <footer className="footer">
        <p>
          © {new Date().getFullYear()} Cavite State University — Official
          Certificate Verification
        </p>
      </footer>
    </>
  );
}
