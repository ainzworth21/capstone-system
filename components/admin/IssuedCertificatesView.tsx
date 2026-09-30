import Link from "next/link";
import { IssuedCertificate, IssuedSpeakerCertificate } from "@/lib/types";

export default function IssuedCertificatesView({
  participantCertificates,
  speakerCertificates,
}: {
  participantCertificates: IssuedCertificate[];
  speakerCertificates: IssuedSpeakerCertificate[];
}) {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h2>Participant Certificates</h2>
        {participantCertificates.length === 0 ? (
          <p className="text-muted">No participant certificates have been issued for main events.</p>
        ) : (
          <div className="card"><div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Participant</th><th>Event</th><th>Email</th><th>Issued</th><th>Verification Code</th><th>Actions</th></tr></thead>
            <tbody>{participantCertificates.map((certificate) => (
              <tr key={certificate.id}>
                <td>{certificate.student_name}</td>
                <td>{certificate.event_title}</td>
                <td>{certificate.student_email}</td>
                <td>{certificate.issued_at}</td>
                <td>{certificate.verification_code}</td>
                <td><Link className="btn btn-secondary btn-sm" href={`/dashboard/certificates/issued/${certificate.id}?type=student`}>View / Download</Link></td>
              </tr>
            ))}</tbody>
          </table></div></div>
        )}
      </section>

      <section>
        <h2>Speaker Certificates</h2>
        {speakerCertificates.length === 0 ? (
          <p className="text-muted">No speaker certificates have been issued for main events.</p>
        ) : (
          <div className="card"><div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Speaker</th><th>Event</th><th>Email</th><th>Issued</th><th>Verification Code</th><th>Actions</th></tr></thead>
            <tbody>{speakerCertificates.map((certificate) => (
              <tr key={certificate.id}>
                <td>{certificate.speaker_name}</td>
                <td>{certificate.event_title}</td>
                <td>{certificate.speaker_email}</td>
                <td>{certificate.issued_at}</td>
                <td>{certificate.verification_code}</td>
                <td><Link className="btn btn-secondary btn-sm" href={`/dashboard/certificates/issued/${certificate.id}?type=speaker`}>View / Download</Link></td>
              </tr>
            ))}</tbody>
          </table></div></div>
        )}
      </section>
    </div>
  );
}
