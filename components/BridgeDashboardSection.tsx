import Link from "next/link";
import { Bridge, Event, Participant, Quiz } from "@/lib/types";
import { getEventsForBridge } from "@/lib/bridge";
import { isAssignedSpeaker } from "@/lib/speaker-registration";

export default function BridgeDashboardSection({
  bridges,
  events,
  registrations,
  speakerId,
  quizzes = [],
}: {
  bridges: Bridge[];
  events: Event[];
  registrations: Participant[];
  speakerId?: string;
  quizzes?: Quiz[];
}) {
  const activeBridges = bridges.filter((bridge) => bridge.is_active !== false);
  if (activeBridges.length === 0) return null;

  return (
    <section id="bridge-programs" style={{ margin: "1.5rem 0" }}>
      <div style={{ marginBottom: ".85rem" }}>
        <h3 style={{ margin: 0 }}>Bridge Programs</h3>
        <p className="text-muted" style={{ margin: ".25rem 0 0" }}>
          Partner-university seminars and webinars
        </p>
      </div>
      <div style={{ display: "grid", gap: "1rem" }}>
        {activeBridges.map((bridge) => {
          const bridgeEvents = getEventsForBridge(events, bridge, bridges);
          const moduleMap = new Map<string, Event[]>();
          for (const event of bridgeEvents) {
            const moduleName = event.category || "General";
            moduleMap.set(moduleName, [...(moduleMap.get(moduleName) ?? []), event]);
          }

          return (
            <article key={bridge.id} className="card">
              <div className="card-header">
                <div>
                  <h4 style={{ margin: 0 }}>{bridge.title}</h4>
                  <p className="text-muted" style={{ margin: ".25rem 0 0" }}>{bridge.partner_name}</p>
                </div>
              </div>
              <div className="card-body" style={{ display: "grid", gap: ".85rem" }}>
                {moduleMap.size === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>Bridge modules and events will appear here when they are added.</p>
                ) : [...moduleMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([module, moduleEvents]) => (
                  <div key={module}>
                    <h5 style={{ margin: "0 0 .45rem" }}>{module}</h5>
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: ".45rem" }}>
                      {moduleEvents.map((event) => {
                        const registration = registrations.find((item) => item.event_id === event.id && item.status !== "cancelled");
                        const assignedSpeaker = !!speakerId && isAssignedSpeaker(event, speakerId);
                        const quiz = quizzes.find((item) => item.event_id === event.id);
                        const questionCount = (quiz?.questions ?? []).filter((question) => question.question.trim()).length;
                        return (
                          <li key={event.id}>
                            <span>{event.title} <span className="text-muted">({event.event_type === "webinar" ? "Webinar" : "Seminar"})</span></span>{" "}
                            {assignedSpeaker && (
                              <Link href={`/speaker/hosted/${event.id}?tab=quiz`}>
                                {questionCount ? "Manage Quiz" : "Create Quiz"}
                              </Link>
                            )}{" "}
                            {registration ? (
                              <Link href={speakerId ? "/speaker/my-events" : `/event/${event.id}`}>
                                {assignedSpeaker ? "Participant Details" : "Details"}
                              </Link>
                            ) : !assignedSpeaker && bridge.is_active !== false && event.status === "upcoming" ? (
                              <Link href={`/register/${event.registration_token}`}>Register</Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}