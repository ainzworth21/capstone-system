"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionUser } from "@/lib/types";

const links = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/my-events", label: "My Registrations" },
  { href: "/student/browse", label: "Browse Events" },
];

export default function StudentSidebar({ user }: { user: SessionUser }) {
  const path = usePathname();

  function active(href: string) {
    if (href === "/student/dashboard") return path === href;
    return path === href || path.startsWith(href + "/");
  }

  return (
    <aside className="sidebar">
      <div
        style={{
          padding: ".75rem 1.75rem 1.25rem",
          borderBottom: "1px solid rgba(201,168,76,.15)",
          marginBottom: ".5rem",
        }}
      >
        <div
          style={{
            fontSize: ".68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".12em",
            color: "var(--gold)",
            opacity: 0.7,
          }}
        >
          Participant Portal
        </div>
        <div
          style={{
            fontSize: ".9375rem",
            fontWeight: 700,
            color: "rgba(255,255,255,.9)",
            marginTop: ".2rem",
          }}
        >
          {user.full_name}
        </div>
        {user.course && (
          <div
            style={{
              fontSize: ".8rem",
              color: "rgba(255,255,255,.5)",
              marginTop: ".15rem",
            }}
          >
            {user.course} · Year {user.year_level}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Menu</div>
        <nav>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`sidebar-link ${active(l.href) ? "active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Account</div>
        <nav>
          <Link href="/change-password" className="sidebar-link">
            Change password
          </Link>
          <Link href="/" className="sidebar-link">
            Home
          </Link>
        </nav>
      </div>
    </aside>
  );
}
