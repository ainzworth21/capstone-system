import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { SessionUser } from "@/lib/types";

/** Speakers land on the native speaker portal. */
export function redirectSpeakerToPortal(
  user: Pick<SessionUser, "role"> | null | undefined
) {
  if (user?.role === "organizer") redirect("/speaker/dashboard");
}

/**
 * Admin-only page/layout guard.
 * Participants → student portal; Speakers → speaker portal.
 */
export function requireAdmin(
  user: Pick<SessionUser, "role"> | null | undefined,
  loginPath = "/login"
) {
  if (!user) redirect(loginPath);
  if (user.role === "admin") return;
  if (user.role === "organizer") redirect("/speaker/dashboard");
  if (user.role === "student") redirect("/student/dashboard");
  redirect(loginPath);
}

/** API guard — returns an error response when the caller is not admin. */
export function requireAdminApi(
  user: Pick<SessionUser, "role"> | null | undefined
): NextResponse | null {
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function isAdmin(
  user: Pick<SessionUser, "role"> | null | undefined
): boolean {
  return user?.role === "admin";
}

/** Home path for the signed-in non-admin role. */
export function portalHome(
  user: Pick<SessionUser, "role"> | null | undefined
): string {
  if (user?.role === "admin") return "/dashboard";
  if (user?.role === "organizer") return "/speaker/dashboard";
  return "/student/dashboard";
}

/** Base path for participant tools (browse, my-events, survey, …). */
export function portalBase(
  user: Pick<SessionUser, "role"> | null | undefined
): "/student" | "/speaker" {
  return user?.role === "organizer" ? "/speaker" : "/student";
}
