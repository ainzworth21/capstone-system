import { NextRequest, NextResponse } from "next/server";
import { findOne, updateOne } from "@/lib/db";
import { getSession } from "@/lib/session";
import { User } from "@/lib/types";
import {
  clientIp,
  getRateLimitStatus,
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  LOGIN_WINDOW_MS,
  recordRateLimitHit,
  resetRateLimit,
} from "@/lib/rate-limit";

function tooMany(retryAfterSec: number, message: string) {
  return NextResponse.json(
    { error: message, retryAfterSec },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

/**
 * Speaker email-only login (reusable).
 * Admin registers the email; speaker signs in with that email any time — no password, no one-time link.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String((body as { email?: string }).email ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const ip = clientIp(req);
  const ipKey = `spk-login:ip:${ip}`;
  const emailKey = `spk-login:email:${ip}:${email}`;

  const ipStatus = getRateLimitStatus(ipKey, LOGIN_IP_LIMIT);
  if (ipStatus.blocked) {
    return tooMany(
      ipStatus.retryAfterSec,
      `Too many attempts from this network. Try again in ${ipStatus.retryAfterSec} seconds.`
    );
  }

  const emailStatus = getRateLimitStatus(emailKey, LOGIN_EMAIL_LIMIT);
  if (emailStatus.blocked) {
    return tooMany(
      emailStatus.retryAfterSec,
      `Too many attempts for this email. Try again in ${emailStatus.retryAfterSec} seconds.`
    );
  }

  const user = findOne<User>(
    "users",
    (u) => u.email.toLowerCase() === email && u.role === "organizer"
  );

  const eligible =
    !!user &&
    (user.account_status ?? "approved") === "approved" &&
    (user.speaker_active ?? true);

  if (!eligible || !user) {
    recordRateLimitHit(emailKey, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS);
    const after = recordRateLimitHit(ipKey, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS);
    const left = getRateLimitStatus(emailKey, LOGIN_EMAIL_LIMIT);
    if (after.blocked || left.blocked) {
      const wait = Math.max(after.retryAfterSec, left.retryAfterSec);
      return tooMany(
        wait,
        `Too many failed attempts. Try again in ${wait} seconds.`
      );
    }
    return NextResponse.json(
      {
        error:
          "This email is not registered as a speaker. Ask the secretariat to register you.",
      },
      { status: 401 }
    );
  }

  resetRateLimit(emailKey);
  resetRateLimit(ipKey);

  if (user.must_change_password) {
    updateOne<User>(
      "users",
      (u) => u.id === user.id,
      (u) => ({ ...u, must_change_password: false })
    );
  }

  const session = await getSession();
  session.user = {
    id: user.id,
    full_name: user.full_name,
    name_prefix: user.name_prefix ?? null,
    first_name: user.first_name ?? null,
    middle_initial: user.middle_initial ?? null,
    last_name: user.last_name ?? null,
    name_suffix: user.name_suffix ?? null,
    email: user.email,
    role: user.role,
    account_status: user.account_status,
    student_id: user.student_id,
    course: user.course,
    year_level: user.year_level,
    designation: user.designation ?? null,
    must_change_password: false,
    email_changes_remaining: user.email_changes_remaining ?? 0,
  };
  await session.save();

  return NextResponse.json({
    success: true,
    role: "organizer",
  });
}
