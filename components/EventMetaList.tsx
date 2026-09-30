import { Event } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";

interface EventMetaListProps {
  event: Pick<
    Event,
    | "event_date"
    | "start_time"
    | "end_time"
    | "event_type"
    | "platform_name"
    | "location"
    | "speaker"
  >;
}

export default function EventMetaList({ event }: EventMetaListProps) {
  const venue =
    event.event_type === "webinar"
      ? `${event.platform_name || "Online"} · Online`
      : event.location;

  return (
    <div className="event-meta">
      <div className="event-meta-item">
        <span className="event-meta-label">Date</span>
        <span className="event-meta-value">{formatDate(event.event_date)}</span>
      </div>
      <div className="event-meta-item">
        <span className="event-meta-label">Time</span>
        <span className="event-meta-value">
          {formatTime(event.start_time)} – {formatTime(event.end_time)}
        </span>
      </div>
      <div className="event-meta-item">
        <span className="event-meta-label">
          {event.event_type === "webinar" ? "Platform" : "Venue"}
        </span>
        <span className="event-meta-value">{venue}</span>
      </div>
      {event.speaker && (
        <div className="event-meta-item">
          <span className="event-meta-label">Speaker</span>
          <span className="event-meta-value">{event.speaker}</span>
        </div>
      )}
    </div>
  );
}
