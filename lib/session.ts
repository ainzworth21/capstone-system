import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { SessionUser } from "./types";

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters in production."
    );
  }
  // Local/dev only — never use this in production
  return "cvsu-events-dev-only-secret-key-min-32-chars!!";
}

export const sessionOptions: SessionOptions = {
  password: sessionPassword(),
  cookieName: "cvsu_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export type AppSession = IronSession<{ user?: SessionUser }>;

export async function getSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  return getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}
