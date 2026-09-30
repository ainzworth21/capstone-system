interface EventTypeBadgeProps {
  eventType: "webinar" | "seminar";
  className?: string;
}

export default function EventTypeBadge({
  eventType,
  className = "",
}: EventTypeBadgeProps) {
  const isWebinar = eventType === "webinar";
  return (
    <span
      className={`event-type-badge ${isWebinar ? "event-type-webinar" : "event-type-seminar"} ${className}`.trim()}
    >
      {isWebinar ? "Webinar" : "Seminar"}
    </span>
  );
}
