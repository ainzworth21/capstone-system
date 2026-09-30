import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { readDB, writeDB } from "@/lib/db";
import { Event, Pubmat } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import CvsuLogo from "@/components/CvsuLogo";
import EnterpriseFeatures from "@/components/EnterpriseFeatures";
import HomeContentTabs from "@/components/HomeContentTabs";
import { portalHome } from "@/lib/speaker-portal";

function syncStatuses(events: Event[]): Event[] {
  let changed = false;
  const updated = events.map((e) => {
    const s = computeEventStatus(e);
    if (s !== e.status) { changed = true; return { ...e, status: s }; }
    return e;
  });
  if (changed) writeDB("events", updated);
  return updated;
}

export default async function HomePage() {
  const user = await getSessionUser();
  const allEvents = syncStatuses(readDB<Event>("events"));
  const featured = allEvents
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 6);

  const pubmats = readDB<Pubmat>("pubmats")
    .filter((p) => p.is_active && p.image_filename)
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
    );

  return (
    <>
      <Navbar user={user} />

      <section className="hero">
        <div className="container">
          <div className="hero-logo-wrap">
            <CvsuLogo size={112} priority className="hero-logo" />
          </div>
          <p className="hero-eyebrow">Cavite State University</p>
          <h1 className="hero-title">
            Campus Event Management System
          </h1>
          <p className="hero-subtitle">
            Discover, register, and attend campus events at Cavite State University — all in one place.
          </p>
          <div className="hero-actions">
            <Link href="/events" className="btn btn-gold btn-lg">Browse Events</Link>
            {!user ? (
              <Link href="/login/speaker" className="btn btn-outline-gold btn-lg">Speaker Login</Link>
            ) : (
              <Link
                href={portalHome(user)}
                className="btn btn-outline-gold btn-lg"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      <HomeContentTabs featured={featured} pubmats={pubmats} />

      <EnterpriseFeatures />

      <footer className="footer">
        <p>© {new Date().getFullYear()} Campus Event Management System — Cavite State University</p>
      </footer>
    </>
  );
}
