import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findOne } from "@/lib/db";
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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String((body as { email?: string }).email ?? "")
    .trim()
    .toLowerCase();
  const password = String((body as { password?: string }).password ?? "");
  const portal = String((body as { portal?: string }).portal ?? "participant");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const ip = clientIp(req);
  const ipKey = `login:ip:${ip}`;
  const emailKey = `login:email:${ip}:${email}`;

  const ipStatus = getRateLimitStatus(ipKey, LOGIN_IP_LIMIT);
  if (ipStatus.blocked) {
    return tooMany(
      ipStatus.retryAfterSec,
      `Too many login attempts from this network. Try again in ${ipStatus.retryAfterSec} seconds.`
    );
  }

  const emailStatus = getRateLimitStatus(emailKey, LOGIN_EMAIL_LIMIT);
  if (emailStatus.blocked) {
    return tooMany(
      emailStatus.retryAfterSec,
      `Too many failed attempts for this account. Try again in ${emailStatus.retryAfterSec} seconds.`
    );
  }

  const user = findOne<User>(
    "users",
    (u) => u.email.toLowerCase() === email
  );

  if (portal === "admin" && user?.role !== "admin") {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  if (portal !== "admin" && user?.role === "admin") {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  // Speakers use email-only login on /login/speaker
  if (user?.role === "organizer") {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  if (!user || !(await bcrypt.compare(password, user.password))) {
    recordRateLimitHit(emailKey, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS);
    const after = recordRateLimitHit(ipKey, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS);
    const left = getRateLimitStatus(emailKey, LOGIN_EMAIL_LIMIT);
    const hint =
      left.remaining <= 2 && !left.blocked
        ? ` (${left.remaining} attempt${left.remaining === 1 ? "" : "s"} left)`
        : "";
    if (after.blocked || left.blocked) {
      const wait = Math.max(after.retryAfterSec, left.retryAfterSec);
      return tooMany(
        wait,
        `Too many failed attempts. Try again in ${wait} seconds.`
      );
    }
    return NextResponse.json(
      { error: `Invalid email or password.${hint}` },
      { status: 401 }
    );
  }

  // Block pending/rejected admin
  if (user.role !== "student") {
    if (user.account_status === "pending") {
      return NextResponse.json(
        { error: "Your account is awaiting admin approval." },
        { status: 403 }
      );
    }
    if (user.account_status === "rejected") {
      return NextResponse.json(
        {
          error:
            "Your registration was rejected. Contact the administrator.",
        },
        { status: 403 }
      );
    }
  }

  resetRateLimit(emailKey);
  resetRateLimit(ipKey);

  const mustChange = !!user.must_change_password;

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
    must_change_password: mustChange,
    email_changes_remaining: user.email_changes_remaining ?? 0,
  };
  await session.save();

  return NextResponse.json({
    role: user.role,
    must_change_password: mustChange,
  });
}
