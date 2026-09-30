"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SessionUser } from "@/lib/types";
import CvsuLogo from "@/components/CvsuLogo";
import NotificationBell from "@/components/NotificationBell";

const adminLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/completion", label: "Completion" },
  { href: "/dashboard/certificates", label: "Cert Monitor" },
  { href: "/dashboard/evaluations", label: "Evaluations" },
  { href: "/dashboard/speakers", label: "Speakers" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/reports", label: "Reporting" },
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/audit", label: "Audit" },
];

export default function AdminTopNav({ user }: { user: SessionUser }) {
  const path = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    const pathOnly = href.split("?")[0];
    if (pathOnly === "/dashboard") return path === "/dashboard";
    if (pathOnly === "/dashboard/events/create") return path === pathOnly;
    if (pathOnly === "/dashboard/events") {
      return (
        path === pathOnly ||
        (path.startsWith(pathOnly + "/") &&
          !path.startsWith("/dashboard/events/create"))
      );
    }
    return path === pathOnly || path.startsWith(pathOnly + "/");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="admin-topbar">
      <div className="admin-topbar-inner">
        <div className="admin-topbar-brand">
          <Link
            href="/dashboard"
            className="admin-topbar-logo-link"
            title="CvSU Dashboard"
          >
            <span className="admin-topbar-logo-badge" aria-hidden={false}>
              <CvsuLogo size={36} />
            </span>
          </Link>
          <div className="admin-topbar-brand-text">
            <span className="admin-topbar-role">Admin · Secretariat</span>
            <span className="admin-topbar-user">
              {user.full_name.split(" ")[0]}
            </span>
          </div>
        </div>

        <div className="admin-topnav-wrap">
          <nav className="admin-topnav" aria-label="Admin">
            {adminLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`admin-topnav-link ${isActive(l.href) ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="admin-topnav-utils">
            <NotificationBell variant="admin" />
            <Link href="/change-password" className="admin-topnav-link">
              Password
            </Link>
            <button
              type="button"
              className="admin-topnav-link admin-topnav-logout"
              onClick={() => void logout()}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
