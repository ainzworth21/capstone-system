"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SessionUser } from "@/lib/types";
import CvsuLogo from "@/components/CvsuLogo";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar({ user }: { user: SessionUser | null }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(user?.role === "organizer" ? "/login/speaker" : "/login");
    router.refresh();
  }

  const dashLink =
    user?.role === "admin"
      ? "/dashboard"
      : user?.role === "organizer"
        ? "/speaker/dashboard"
        : "/student/dashboard";

  const showPortalAlerts =
    user?.role === "student" || user?.role === "organizer";

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand">
          <CvsuLogo size={44} priority />
          <span className="brand-text">
            <em>CvSU</em> Events
          </span>
        </Link>

        <div className="navbar-nav">
          <Link href="/" className="navbar-link">Home</Link>
          <Link href="/events" className="navbar-link">Events</Link>

          {user ? (
            <>
              <Link href={dashLink} className="navbar-link">Dashboard</Link>
              {showPortalAlerts && <NotificationBell variant="navbar" />}
              <div className="navbar-user">
                <div className="navbar-user-name">
                  {user.full_name}
                  <span className="navbar-role-badge">
                    {user.role === "organizer" ? "speaker" : user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="btn btn-outline-gold btn-sm navbar-logout"
                  type="button"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link href="/login" className="btn btn-gold btn-sm">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
