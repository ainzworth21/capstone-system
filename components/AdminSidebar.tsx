"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionUser } from "@/lib/types";

const links = [
  { href: "/dashboard",           label: "Dashboard" },
  { href: "/dashboard/events",    label: "All Events" },
  { href: "/dashboard/events/create", label: "Create Event" },
  { href: "/dashboard/certificates", label: "Cert Monitor" },
  { href: "/dashboard/evaluations", label: "Evaluations" },
  { href: "/dashboard/settings",  label: "Global Settings" },
  { href: "/dashboard/users",     label: "User Overview" },
  { href: "/dashboard/reports",   label: "Reports" },
  { href: "/dashboard/bridges",   label: "Bridges" },
];

export default function AdminSidebar({ user }: { user: SessionUser }) {
  const path = usePathname();

  function active(href: string) {
    if (href === "/dashboard") return path === href;
    return path === href || path.startsWith(`${href}/`);
  }

  return (
    <aside className="sidebar">
      <div style={{ padding: ".75rem 1.75rem 1.25rem", borderBottom: "1px solid rgba(201,168,76,.35)", marginBottom: ".5rem" }}>
        <div style={{ fontSize: ".8125rem", fontWeight: 600, color: "var(--gold)", letterSpacing: ".01em" }}>
          Admin · Secretariat
        </div>
        <div style={{ fontSize: ".8125rem", fontWeight: 400, color: "rgba(255,255,255,.72)", marginTop: ".15rem" }}>
          Hi, {user.full_name.split(" ")[0]}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Menu</div>
        <nav>
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`sidebar-link ${active(l.href) ? "active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Account</div>
        <nav>
          <Link href="/" className="sidebar-link">Home</Link>
        </nav>
      </div>
    </aside>
  );
}
