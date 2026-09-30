"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AppNotification } from "@/lib/types";

type Variant = "admin" | "sidebar" | "navbar";

export default function NotificationBell({
  variant = "navbar",
}: {
  variant?: Variant;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setUnread(Number(data.unread) || 0);
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAll() {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  async function markOne(id: string) {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  const btnClass =
    variant === "admin"
      ? "admin-topnav-link notif-bell-btn"
      : variant === "sidebar"
        ? "sidebar-link notif-bell-btn notif-bell-btn--sidebar"
        : "navbar-link notif-bell-btn";

  return (
    <div className={`notif-bell notif-bell--${variant}`} ref={rootRef}>
      <button
        type="button"
        className={btnClass}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {variant !== "sidebar" && <span className="notif-bell-label">Alerts</span>}
        {variant === "sidebar" && <span>Notifications</span>}
        {unread > 0 && (
          <span className="notif-bell-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div id={panelId} className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => void markAll()}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-panel-body">
            {loading && items.length === 0 && (
              <p className="text-muted" style={{ margin: 0, padding: ".75rem" }}>
                Loading…
              </p>
            )}
            {!loading && items.length === 0 && (
              <p className="text-muted" style={{ margin: 0, padding: ".75rem" }}>
                No notifications yet.
              </p>
            )}
            {items.map((n) => {
              const unreadItem = !n.read_at;
              const inner = (
                <>
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-body">{n.body}</div>
                  <div className="notif-item-time">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </>
              );
              return (
                <div
                  key={n.id}
                  className={`notif-item ${unreadItem ? "unread" : ""}`}
                >
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="notif-item-link"
                      onClick={() => {
                        if (unreadItem) void markOne(n.id);
                        setOpen(false);
                      }}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="notif-item-link"
                      onClick={() => {
                        if (unreadItem) void markOne(n.id);
                      }}
                    >
                      {inner}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
