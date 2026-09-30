import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { findOne, readDB } from "@/lib/db";
import { Bridge, Event, Participant } from "@/lib/types";
import { computeEventStatus } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import EventMetaList from "@/components/EventMetaList";
import RegisterForm from "./RegisterForm";
import { getBridgeForEvent } from "@/lib/bridge";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getSessionUser();
  const event = findOne<Event>("events", (e) => e.registration_token === token);
  if (!event || event.status === "cancelled") notFound();
  const bridge = getBridgeForEvent(event, readDB<Bridge>("bridges"));
  if (bridge?.is_active === false) notFound();

  const updatedEvent = { ...event, status: computeEventStatus(event) };
  const registered = readDB<Participant>("participants").filter(
    (p) => p.event_id === event.id && ["registered","attended"].includes(p.status)
  ).length;
  const pct = event.capacity > 0 ? Math.min(100, Math.round(registered / event.capacity * 100)) : 0;
  const isFull = registered >= event.capacity;

  const prefill = user
    ? {
        first_name: user.first_name ?? "",
        middle_initial: user.middle_initial ?? "",
        last_name: user.last_name ?? "",
        name_suffix: user.name_suffix ?? "",
        email: user.email,
        student_id: user.student_id ?? "",
        course: user.course ?? "",
        year_level: user.year_level?.toString() ?? "",
        designation: user.designation ?? "",
      }
    : null;

  // Legacy accounts with only full_name — put it in first name for editing
  if (prefill && !prefill.first_name && !prefill.last_name && user?.full_name) {
    prefill.first_name = user.full_name;
  }

  return (
    <>
      <Navbar user={user} />
      <div className="container" style={{ maxWidth: 700, padding: "2rem 1.5rem" }}>
        {/* Event Info */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="event-banner" style={{ height: 120 }} />
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: ".5rem", marginBottom: ".75rem" }}>
              <span className={`badge badge-${event.category.toLowerCase().replace(/\s/g,"-")}`} style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                {event.category}
              </span>
              <span className={`badge badge-${updatedEvent.status}`}>{updatedEvent.status.charAt(0).toUpperCase() + updatedEvent.status.slice(1)}</span>
            </div>
            <h2 style={{ fontSize: "1.375rem", marginBottom: ".75rem" }}>{event.title}</h2>
            {event.description && <p style={{ color: "var(--gray-700)", marginBottom: "1rem" }}>{event.description}</p>}
            <EventMetaList event={event} />
            <div style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".875rem", marginBottom: ".375rem" }}>
                <span>{registered}/{event.capacity} registered</span>
                <span>{pct}% full</span>
              </div>
              <div className="capacity-bar">
                <div className={`capacity-fill ${pct >= 100 ? "full" : pct >= 80 ? "near" : ""}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <RegisterForm event={updatedEvent} isFull={isFull} prefill={prefill} isLoggedIn={!!user} />
      </div>
      <footer className="footer"><p>© {new Date().getFullYear()} CvSU Campus Event Management System</p></footer>
    </>
  );
}
