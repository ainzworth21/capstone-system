/**
 * Phase 4 smoke tests — run with: npm test
 * Uses Node's built-in test runner (no Jest/Vitest).
 *
 * Pure helpers are mirrored here so tests do not need Next.js path aliases.
 * Behavior must stay in sync with lib/rate-limit, lib/password-reset,
 * lib/authz, and lib/speaker-portal.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRateLimitStatus,
  recordRateLimitHit,
  resetRateLimit,
  LOGIN_EMAIL_LIMIT,
  LOGIN_WINDOW_MS,
} from "../lib/rate-limit.ts";
import {
  getParticipantLoginHref,
  getSpeakerLoginHref,
} from "../lib/auth-links.ts";
import {
  getTopicsForModule,
  mergeModuleTopics,
  removeTopicFromModule,
} from "../lib/module-topics.ts";
import {
  classifyBridgeEvent,
  getEventsForBridge,
  getMainEvents,
  getBridgeGroups,
  getBridgeHierarchy,
} from "../lib/bridge.ts";

function validateResetToken(row, nowMs = Date.now()) {
  if (!row) {
    return {
      ok: false,
      error: "This reset link is invalid or has already been used.",
    };
  }
  if (row.used_at) {
    return { ok: false, error: "This reset link has already been used." };
  }
  if (new Date(row.expires_at).getTime() < nowMs) {
    return {
      ok: false,
      error: "This reset link has expired. Please request a new one.",
    };
  }
  return { ok: true };
}

function isEventHost(event, userId) {
  return event.organizer_id === userId || event.speaker_id === userId;
}

function canManageEvent(user, event) {
  if (!user || !event) return false;
  if (user.role === "admin") return true;
  if (user.role === "organizer" && isEventHost(event, user.id)) return true;
  return false;
}

function requireAdminApi(user) {
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized", status: 401 };
  }
  return null;
}

describe("login rate limit", () => {
  it("blocks after LOGIN_EMAIL_LIMIT failures for a key", () => {
    const key = `smoke-test-email-${Date.now()}`;
    resetRateLimit(key);

    for (let i = 0; i < LOGIN_EMAIL_LIMIT - 1; i++) {
      const s = recordRateLimitHit(key, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS);
      assert.equal(s.blocked, false);
    }
    const last = recordRateLimitHit(key, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS);
    assert.equal(last.blocked, true);
    assert.ok(last.retryAfterSec >= 1);

    const status = getRateLimitStatus(key, LOGIN_EMAIL_LIMIT);
    assert.equal(status.blocked, true);

    resetRateLimit(key);
    assert.equal(getRateLimitStatus(key, LOGIN_EMAIL_LIMIT).blocked, false);
  });
});

describe("password reset token one-time use", () => {
  it("rejects missing, used, and expired tokens", () => {
    assert.equal(validateResetToken(null).ok, false);

    const used = validateResetToken({
      used_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    assert.equal(used.ok, false);
    assert.match(used.error, /already been used/i);

    const expired = validateResetToken({
      used_at: null,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    assert.equal(expired.ok, false);
    assert.match(expired.error, /expired/i);

    const fresh = validateResetToken({
      used_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    assert.equal(fresh.ok, true);
  });
});

describe("admin API guard (non-admin cannot use /dashboard APIs)", () => {
  it("rejects non-admin callers", () => {
    assert.ok(requireAdminApi(null));
    assert.ok(requireAdminApi({ role: "student" }));
    assert.ok(requireAdminApi({ role: "organizer" }));
    assert.equal(requireAdminApi({ role: "admin" }), null);
  });
});

describe("auth navigation helpers", () => {
  it("uses the correct participant and speaker login routes", () => {
    assert.equal(getParticipantLoginHref(), "/login");
    assert.equal(getSpeakerLoginHref(), "/login/speaker");
  });
});

describe("module-topic grouping", () => {
  it("merges and removes topics under each module", () => {
    const initial = [
      { module: "Technology", topics: ["AI", "Cybersecurity"] },
      { module: "Leadership", topics: ["Team Building"] },
    ];

    const merged = mergeModuleTopics(initial, "Technology", "Data Science");
    assert.deepEqual(getTopicsForModule(merged, "Technology"), [
      "AI",
      "Cybersecurity",
      "Data Science",
    ]);

    const cleaned = removeTopicFromModule(merged, "Leadership", "Team Building");
    assert.deepEqual(getTopicsForModule(cleaned, "Leadership"), []);
  });
});

describe("bridge grouping", () => {
  it("classifies bridge events without disturbing legacy event records", () => {
    const events = [
      { id: "e1", title: "Bridge 1: Digital Skills", category: "Bridge", bridge_name: "Bridge 1" },
      { id: "e2", title: "AI Basics", category: "Technology" },
      { id: "e3", title: "Bridge 2: Leadership", category: "General", bridge_name: "Bridge 2" },
    ];

    assert.equal(classifyBridgeEvent(events[0]), "Bridge 1");
    assert.equal(classifyBridgeEvent(events[1]), "");
    assert.deepEqual(getBridgeGroups(events).map((g) => g.label), ["Bridge 1", "Bridge 2"]);
  });

  it("builds nested bridge hierarchy by bridge, module, and event", () => {
    const events = [
      { id: "e1", title: "Bridge 1: Digital Skills", category: "Bridge", bridge_name: "Bridge 1", bridge_id: "bridge-1" },
      { id: "e2", title: "Webinar A", category: "Data Science", bridge_name: "Bridge 1", bridge_id: "bridge-1" },
      { id: "e3", title: "Seminar B", category: "Data Science", bridge_name: "Bridge 1", bridge_id: "bridge-1" },
      { id: "e4", title: "Webinar C", category: "AI", bridge_name: "Bridge 1", bridge_id: "bridge-1" },
      { id: "e5", title: "Bridge 2: Leadership", category: "General", bridge_name: "Bridge 2", bridge_id: "bridge-2" },
      { id: "e6", title: "Workshop D", category: "Leadership", bridge_name: "Bridge 2", bridge_id: "bridge-2" },
    ];

    const hierarchy = getBridgeHierarchy(events);
    assert.deepEqual(hierarchy.map((group) => group.label), ["Bridge 1", "Bridge 2"]);
    assert.deepEqual(hierarchy[0].modules.map((m) => m.name), ["AI", "Data Science"]);
    assert.deepEqual(hierarchy[0].modules[1].events.map((e) => e.title), ["Seminar B", "Webinar A"]);
    assert.equal(hierarchy[1].modules[0].events[0].title, "Workshop D");
  });

  it("matches legacy bridge events by title when their old ID has no bridge record", () => {
    const bridge = { id: "bridge-record-id", title: "Bridge 2 - Test 2" };
    const bridges = [bridge];
    const events = [
      { id: "legacy", title: "test 2", bridge_id: "bridge-2-test-2", bridge_name: bridge.title },
      { id: "current", title: "seminar", bridge_id: bridge.id, bridge_name: bridge.title },
      { id: "other", title: "other", bridge_id: "another-bridge", bridge_name: "Other Bridge" },
    ];

    assert.deepEqual(getEventsForBridge(events, bridge, bridges).map((event) => event.id), ["legacy", "current"]);
  });

  it("keeps saved and legacy Bridge events out of the main event set", () => {
    const bridge = { id: "bridge-id", title: "Partner Bridge" };
    const events = [
      { id: "main", title: "Main Seminar", category: "Technology" },
      { id: "bridge", title: "Bridge Webinar", category: "Technology", bridge_id: bridge.id, bridge_name: bridge.title },
      { id: "legacy", title: "Old Bridge Event", category: "Bridge: Partner Bridge" },
    ];

    assert.deepEqual(getMainEvents(events, [bridge]).map((event) => event.id), ["main"]);
  });
});

describe("invited speaker one-time email change", () => {
  function canChangeEmail(remaining) {
    return (remaining ?? 0) > 0;
  }
  function afterEmailChange(remaining) {
    if (!canChangeEmail(remaining)) {
      return { ok: false, remaining: remaining ?? 0 };
    }
    return { ok: true, remaining: 0 };
  }

  it("allows exactly one change then locks", () => {
    assert.equal(canChangeEmail(1), true);
    assert.equal(canChangeEmail(0), false);
    assert.equal(canChangeEmail(undefined), false);

    const first = afterEmailChange(1);
    assert.equal(first.ok, true);
    assert.equal(first.remaining, 0);

    const second = afterEmailChange(0);
    assert.equal(second.ok, false);
  });
});

describe("speaker cannot manage other hosts' events / admin cert scope", () => {
  const event = {
    id: "e1",
    organizer_id: "host-1",
    speaker_id: "speaker-1",
    speaker_ids: ["speaker-1", "speaker-2"],
  };

  function eventSpeakerIds(ev) {
    if (Array.isArray(ev.speaker_ids) && ev.speaker_ids.length > 0) {
      return [...new Set(ev.speaker_ids.filter(Boolean))];
    }
    return ev.speaker_id ? [ev.speaker_id] : [];
  }

  function isAssignedSpeaker(ev, userId) {
    return eventSpeakerIds(ev).includes(userId);
  }

  function isEventHostMulti(ev, userId) {
    return ev.organizer_id === userId || isAssignedSpeaker(ev, userId);
  }

  function canManageEventMulti(user, ev) {
    if (!user || !ev) return false;
    if (user.role === "admin") return true;
    if (user.role === "organizer" && isEventHostMulti(ev, user.id)) return true;
    return false;
  }

  it("only admin or event host can manage", () => {
    assert.equal(canManageEvent({ id: "admin", role: "admin" }, event), true);
    assert.equal(
      canManageEvent({ id: "host-1", role: "organizer" }, event),
      true
    );
    assert.equal(
      canManageEvent({ id: "speaker-1", role: "organizer" }, event),
      true
    );
    assert.equal(
      canManageEvent({ id: "other-speaker", role: "organizer" }, event),
      false
    );
    assert.equal(
      canManageEvent({ id: "student-1", role: "student" }, event),
      false
    );
  });

  it("isEventHost matches organizer or speaker_id only (legacy smoke)", () => {
    assert.equal(isEventHost(event, "host-1"), true);
    assert.equal(isEventHost(event, "speaker-1"), true);
    assert.equal(isEventHost(event, "stranger"), false);
  });

  it("multi-speaker: any speaker_ids member is host", () => {
    assert.equal(isEventHostMulti(event, "speaker-1"), true);
    assert.equal(isEventHostMulti(event, "speaker-2"), true);
    assert.equal(isEventHostMulti(event, "stranger"), false);
    assert.equal(
      canManageEventMulti({ id: "speaker-2", role: "organizer" }, event),
      true
    );
    assert.equal(
      canManageEventMulti({ id: "stranger", role: "organizer" }, event),
      false
    );
  });

  it("normalizes legacy speaker_id into speaker_ids", () => {
    const legacy = { speaker_id: "a", speaker_ids: undefined };
    assert.deepEqual(eventSpeakerIds(legacy), ["a"]);
    const multi = { speaker_id: "a", speaker_ids: ["b", "c"] };
    assert.deepEqual(eventSpeakerIds(multi), ["b", "c"]);
  });

  it("speakersTableLabel shows +N for multiple", () => {
    function speakersTableLabel(ev) {
      const ids = eventSpeakerIds(ev);
      if (ids.length === 0) return ev.speaker?.trim() || "—";
      const first = (ev.speaker || "").split(" · ")[0]?.trim() || "Speaker";
      if (ids.length === 1) return first;
      return `${first} +${ids.length - 1}`;
    }
    assert.equal(
      speakersTableLabel({
        speaker_ids: ["a", "b", "c"],
        speaker: "Ada · Bob · Cara",
      }),
      "Ada +2"
    );
    assert.equal(
      speakersTableLabel({ speaker_ids: ["a"], speaker: "Ada" }),
      "Ada"
    );
  });
});
