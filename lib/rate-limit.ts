/**
 * Auth rate limiter with in-memory cache + durable `data/login_attempts.json`
 * so counters survive `npm run dev` restarts (class-project scale).
 */

import fs from "fs";
import path from "path";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitStatus = {
  blocked: boolean;
  remaining: number;
  retryAfterSec: number;
};

const STORE_PATH = path.join(process.cwd(), "data", "login_attempts.json");
const buckets = new Map<string, Bucket>();
let hydrated = false;

function prune(now: number) {
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const data = JSON.parse(raw) as Record<string, Bucket>;
    const now = Date.now();
    for (const [key, b] of Object.entries(data)) {
      if (
        b &&
        typeof b.count === "number" &&
        typeof b.resetAt === "number" &&
        b.resetAt > now
      ) {
        buckets.set(key, { count: b.count, resetAt: b.resetAt });
      }
    }
  } catch {
    // Missing or invalid file — start empty
  }
}

function flush() {
  const now = Date.now();
  prune(now);
  const out: Record<string, Bucket> = {};
  for (const [key, b] of buckets) {
    out[key] = b;
  }
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(out, null, 2), "utf-8");
  } catch {
    // Best-effort; in-memory still works for this process
  }
}

/** Check whether the key is currently locked (does not increment). */
export function getRateLimitStatus(
  key: string,
  limit: number
): RateLimitStatus {
  hydrate();
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    return { blocked: false, remaining: limit, retryAfterSec: 0 };
  }
  if (existing.count >= limit) {
    return {
      blocked: true,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return {
    blocked: false,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: 0,
  };
}

/** Record a failed attempt. */
export function recordRateLimitHit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitStatus {
  hydrate();
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  let status: RateLimitStatus;
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    status = { blocked: false, remaining: limit - 1, retryAfterSec: 0 };
  } else {
    existing.count += 1;
    if (existing.count >= limit) {
      status = {
        blocked: true,
        remaining: 0,
        retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    } else {
      status = {
        blocked: false,
        remaining: Math.max(0, limit - existing.count),
        retryAfterSec: 0,
      };
    }
  }
  flush();
  return status;
}

/** Clear counters for a key (e.g. after successful login). */
export function resetRateLimit(key: string) {
  hydrate();
  if (buckets.delete(key)) flush();
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/** Login: 5 failures per email+IP / 15 min; 25 failures per IP / 15 min. */
export const LOGIN_EMAIL_LIMIT = 5;
export const LOGIN_IP_LIMIT = 25;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
