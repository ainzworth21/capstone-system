"use client";

import { useMemo, useState } from "react";
import {
  EventPrePostDistribution,
  LikertDistribution,
  QuestionDistribution,
} from "@/lib/summary-report";

type SortKey =
  | "name-asc"
  | "name-desc"
  | "date-desc"
  | "date-asc"
  | "paired-desc"
  | "topic-asc";

function eventTypeLabel(type: "webinar" | "seminar") {
  return type === "webinar" ? "Webinar" : "Seminar";
}

function PrePostLikertChart({
  question,
  distribution,
  stacked,
}: {
  question: QuestionDistribution;
  distribution: LikertDistribution;
  stacked: boolean;
}) {
  const { pre, post } = distribution;
  const maxCount = Math.max(
    1,
    ...pre.map((p, i) => (stacked ? p + post[i] : Math.max(p, post[i])))
  );
  const chartHeight = 160;

  return (
    <div className="prepost-chart-card">
      <h4 className="prepost-chart-title">
        <strong>{question.label}:</strong> {question.question} — Pre vs Post
        (Likert 1–5)
      </h4>
      <div className="prepost-chart-legend">
        <span>
          <span className="prepost-swatch pre" /> Pre
        </span>
        <span>
          <span className="prepost-swatch post" /> Post
        </span>
      </div>
      <div className="prepost-chart-area">
        {[1, 2, 3, 4, 5].map((rating) => {
          const idx = rating - 1;
          const preCount = pre[idx];
          const postCount = post[idx];
          const preH = (preCount / maxCount) * chartHeight;
          const postH = (postCount / maxCount) * chartHeight;

          return (
            <div key={rating} className="prepost-chart-col">
              <div
                className="prepost-bars"
                style={{ height: `${chartHeight}px` }}
              >
                {stacked ? (
                  <div className="prepost-stacked-bar">
                    {postCount > 0 && (
                      <div
                        className="prepost-bar post"
                        style={{ height: `${postH}px` }}
                      >
                        <span className="prepost-bar-label">{postCount}</span>
                      </div>
                    )}
                    {preCount > 0 && (
                      <div
                        className="prepost-bar pre"
                        style={{ height: `${preH}px` }}
                      >
                        <span className="prepost-bar-label">{preCount}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {preCount > 0 && (
                      <div
                        className="prepost-bar pre"
                        style={{ height: `${preH}px` }}
                      >
                        <span className="prepost-bar-label">{preCount}</span>
                      </div>
                    )}
                    {postCount > 0 && (
                      <div
                        className="prepost-bar post"
                        style={{ height: `${postH}px` }}
                      >
                        <span className="prepost-bar-label">{postCount}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="prepost-xlabel">{rating}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventAccordion({
  event,
  stacked,
  defaultOpen,
}: {
  event: EventPrePostDistribution;
  stacked: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`prepost-event-panel ${open ? "open" : ""}`}>
      <button
        type="button"
        className="prepost-event-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="prepost-event-title">
          <span className="prepost-event-type">
            {eventTypeLabel(event.eventType)}
          </span>
          <span>{event.label}</span>
          <span className="prepost-event-topic">{event.topic}</span>
          <span className="prepost-event-meta">
            {event.pairedCount} paired respondent
            {event.pairedCount !== 1 ? "s" : ""}
          </span>
        </span>
        <span className="prepost-event-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="prepost-event-body">
          <div className="prepost-charts-grid">
            {event.questions.map((q) => (
              <PrePostLikertChart
                key={`${event.eventId}-${q.label}`}
                question={q}
                distribution={q.distribution}
                stacked={stacked}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function sortEvents(
  list: EventPrePostDistribution[],
  sort: SortKey
): EventPrePostDistribution[] {
  const copy = [...list];
  copy.sort((a, b) => {
    switch (sort) {
      case "name-desc":
        return b.label.localeCompare(a.label);
      case "date-desc":
        return b.eventDate.localeCompare(a.eventDate);
      case "date-asc":
        return a.eventDate.localeCompare(b.eventDate);
      case "paired-desc":
        return b.pairedCount - a.pairedCount;
      case "topic-asc":
        return (
          a.topic.localeCompare(b.topic) || a.label.localeCompare(b.label)
        );
      case "name-asc":
      default:
        return a.label.localeCompare(b.label);
    }
  });
  return copy;
}

export function PrePostDistributionSection({
  events,
}: {
  events: EventPrePostDistribution[];
}) {
  const [stacked, setStacked] = useState(false);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "webinar" | "seminar">("");
  const [sort, setSort] = useState<SortKey>("name-asc");

  const topics = useMemo(
    () => [...new Set(events.map((e) => e.topic))].sort(),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = events;
    if (q) {
      list = list.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.topic.toLowerCase().includes(q)
      );
    }
    if (topicFilter) {
      list = list.filter((e) => e.topic === topicFilter);
    }
    if (typeFilter) {
      list = list.filter((e) => e.eventType === typeFilter);
    }
    return sortEvents(list, sort);
  }, [events, search, topicFilter, typeFilter, sort]);

  const hasActiveFilters = !!(search || topicFilter || typeFilter);

  return (
    <div className="card prepost-distribution-section">
      <div className="prepost-section-header">
        <div>
          <h2 className="summary-section-title" style={{ margin: 0 }}>
            Pre vs Post Distribution by Question (per Webinar/Seminar)
          </h2>
          <p className="prepost-section-desc">
            Counts of responses (Likert 1–5) for each question. Two datasets:
            Pre (before the event) and Post (after the event). Use the toggle to
            switch between stacked and non-stacked views.{" "}
            <strong>Paired only:</strong> includes respondents who answered both
            Pre &amp; Post.
          </p>
        </div>
        <label className="prepost-toggle">
          <input
            type="checkbox"
            checked={stacked}
            onChange={(e) => setStacked(e.target.checked)}
          />
          <span className="prepost-toggle-track" aria-hidden />
          <span>Stacked bars (Pre + Post)</span>
        </label>
      </div>

      {events.length === 0 ? (
        <p
          className="text-muted"
          style={{ padding: "1.25rem", margin: 0, fontSize: ".875rem" }}
        >
          No paired pre/post responses for the selected filter.
        </p>
      ) : (
        <>
          <div className="prepost-filter-bar">
            <div className="form-group" style={{ margin: 0, flex: "1 1 200px" }}>
              <label className="form-label">Search module</label>
              <input
                type="search"
                className="form-control"
                placeholder="Module name or topic…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
              <label className="form-label">Module</label>
              <select
                className="form-control"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
              >
                <option value="">All modules</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
              <label className="form-label">Type</label>
              <select
                className="form-control"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as "" | "webinar" | "seminar")
                }
              >
                <option value="">All</option>
                <option value="webinar">Webinar</option>
                <option value="seminar">Seminar</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
              <label className="form-label">Sort by</label>
              <select
                className="form-control"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="name-asc">Module name (A–Z)</option>
                <option value="name-desc">Module name (Z–A)</option>
                <option value="topic-asc">Module (A–Z)</option>
                <option value="date-desc">Event date (newest)</option>
                <option value="date-asc">Event date (oldest)</option>
                <option value="paired-desc">Most paired responses</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-secondary btn-sm prepost-filter-reset"
                onClick={() => {
                  setSearch("");
                  setTopicFilter("");
                  setTypeFilter("");
                }}
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="prepost-results-meta">
            Showing {filteredEvents.length} of {events.length} module
            {events.length !== 1 ? "s" : ""}
          </div>

          {filteredEvents.length === 0 ? (
            <p
              className="text-muted"
              style={{ padding: "1.25rem", margin: 0, fontSize: ".875rem" }}
            >
              No modules match your filters.
            </p>
          ) : (
            <div className="prepost-event-list">
              {filteredEvents.map((event, i) => (
                <EventAccordion
                  key={event.eventId}
                  event={event}
                  stacked={stacked}
                  defaultOpen={i === 0 && !hasActiveFilters}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
