"use client";

import { useState } from "react";
import Link from "next/link";
import { Event, Pubmat } from "@/lib/types";
import EventMetaList from "@/components/EventMetaList";
import EventTypeBadge from "@/components/EventTypeBadge";

export default function HomeContentTabs({
  featured,
  pubmats,
}: {
  featured: Event[];
  pubmats: Pubmat[];
}) {
  const [tab, setTab] = useState<"events" | "pubmat">("events");

  return (
    <section className="section">
      <div className="container">
        <div className="home-tabs report-tabs" style={{ marginBottom: "1.5rem" }}>
          <button
            type="button"
            className={`report-tab ${tab === "events" ? "active" : ""}`}
            onClick={() => setTab("events")}
          >
            Events
          </button>
          <button
            type="button"
            className={`report-tab ${tab === "pubmat" ? "active" : ""}`}
            onClick={() => setTab("pubmat")}
          >
            Announcement
          </button>
        </div>

        {tab === "events" && (
          <>
            <div className="section-header">
              <h2>Upcoming Events</h2>
              <p className="text-muted">
                Scheduled webinars and seminars open for registration
              </p>
            </div>

            {featured.length === 0 ? (
              <div className="card empty-state-card">
                <div className="card-body empty-state">
                  <h3>No upcoming events</h3>
                  <p className="text-muted">
                    Check back soon for new campus activities.
                  </p>
                </div>
              </div>
            ) : (
              <div className="events-grid">
                {featured.map((ev) => (
                  <div key={ev.id} className="event-card">
                    <div className="event-banner">
                      <span className="event-category">{ev.category}</span>
                    </div>
                    <div className="event-card-body">
                      <div className="event-title">{ev.title}</div>
                      <EventMetaList event={ev} />
                    </div>
                    <div className="event-card-footer">
                      <div className="event-card-badges">
                        <span className={`badge badge-${ev.status}`}>
                          {ev.status.charAt(0).toUpperCase() +
                            ev.status.slice(1)}
                        </span>
                        <EventTypeBadge eventType={ev.event_type} />
                      </div>
                      <Link
                        href={`/register/${ev.registration_token}`}
                        className="btn btn-gold btn-sm"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {featured.length > 0 && (
              <div className="text-center mt-8">
                <Link href="/events" className="btn btn-outline-gold btn-lg">
                  View All Events
                </Link>
              </div>
            )}
          </>
        )}

        {tab === "pubmat" && (
          <>
            <div className="section-header">
              <h2>Announcement</h2>
              <p className="text-muted">
                Official announcements and publicity materials from CvSU events
              </p>
            </div>

            {pubmats.length === 0 ? (
              <div className="card empty-state-card">
                <div className="card-body empty-state">
                  <h3>No announcements posted yet</h3>
                  <p className="text-muted">
                    Check back soon for event posters and announcements.
                  </p>
                </div>
              </div>
            ) : (
              <div className="pubmat-grid">
                {pubmats.map((p) => (
                  <article key={p.id} className="pubmat-card">
                    <a
                      href={`/pubmats/${p.image_filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pubmat-image-link"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/pubmats/${p.image_filename}`}
                        alt={p.title}
                        className="pubmat-image"
                      />
                    </a>
                    <div className="pubmat-body">
                      <h3 className="pubmat-title">{p.title}</h3>
                      {p.caption ? (
                        <p className="pubmat-caption">{p.caption}</p>
                      ) : null}
                      <a
                        href={`/pubmats/${p.image_filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-secondary"
                      >
                        View full size
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
