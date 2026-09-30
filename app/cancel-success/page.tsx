import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getSessionUser } from "@/lib/session";

export default async function CancelSuccessPage() {
  const user = await getSessionUser();
  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 500, padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ width: 84, height: 84, background: "#edf7f1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", border: "3px solid var(--gold)", color: "var(--primary)", fontWeight: 800, fontSize: "1.25rem", letterSpacing: ".04em" }}>
          Done
        </div>
        <h2>Registration Cancelled</h2>
        <p className="text-muted" style={{ margin: "1rem 0 2rem" }}>Your registration has been successfully cancelled.</p>
        <Link href="/events" className="btn btn-gold">Browse Events</Link>
      </div>
      <footer className="footer"><p>© {new Date().getFullYear()} CvSU Campus Event Management System</p></footer>
    </>
  );
}
