"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionUser } from "@/lib/types";

const mainLinks = [
  { href: "/speaker/dashboard", label: "Dashboard" },
  { href: "/speaker/hosted", label: "My Topics" },
  { href: "/speaker/profile", label: "Profile" },
];

export default function SpeakerSidebar({ user }: { user: SessionUser }) {
  const path = usePathname();

  function active(href: string) {
    if (href === "/speaker/dashboard") return path === href;
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
          Speaker Portal
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
        <div
          style={{
            fontSize: ".75rem",
            color: "rgba(255,255,255,.45)",
            marginTop: ".35rem",
          }}
        >
          {user.email}
        </div>
        <div
          style={{
            fontSize: ".75rem",
            color: "rgba(255,255,255,.45)",
            marginTop: ".2rem",
          }}
        >
          Topics · Quizzes · Profile
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Main</div>
        <nav>
          {mainLinks.map((l) => (
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
          <Link href="/" className="sidebar-link">
            Home
          </Link>
        </nav>
      </div>
    </aside>
  );
}
