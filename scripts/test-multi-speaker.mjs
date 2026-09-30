/**
 * Live multi-speaker API smoke against local Next.js (npm run dev).
 * Run: node scripts/test-multi-speaker.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.TEST_BASE || "http://localhost:3000";
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "..", "data");

function cookieJar() {
  let jar = "";
  return {
    store(res) {
      const raw = res.headers.getSetCookie?.() || [];
      if (raw.length) {
        jar = raw.map((c) => c.split(";")[0]).join("; ");
        return;
      }
      const single = res.headers.get("set-cookie");
      if (single) jar = single.split(",")[0].split(";")[0];
    },
    header() {
      return jar;
    },
  };
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function main() {
  const users = JSON.parse(
    fs.readFileSync(path.join(dataDir, "users.json"), "utf8")
  );
  const speakers = users.filter(
    (u) => u.role === "organizer" && u.account_status === "approved"
  );
  assert.ok(speakers.length >= 2, "Need at least 2 approved speakers in data");

  const [sp1, sp2] = speakers;
  const jar = cookieJar();

  // 1) Admin login
  {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@cvsu.edu.ph",
        password: "Admin@1234",
      }),
    });
    jar.store(res);
    const body = await json(res);
    assert.equal(res.status, 200, `admin login: ${JSON.stringify(body)}`);
    assert.ok(jar.header(), "session cookie missing");
    console.log("OK admin login");
  }

  // 2) Create event with two speakers
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 10);
  const eventDate = tomorrow.toISOString().slice(0, 10);

  let eventId;
  {
    const res = await fetch(`${BASE}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jar.header(),
      },
      body: JSON.stringify({
        title: `Multi-speaker test ${Date.now()}`,
        description: "Automated multi-speaker smoke test — safe to delete.",
        speaker_ids: [sp1.id, sp2.id],
        event_type: "seminar",
        location: "Test Hall",
        platform_link: "",
        platform_name: "",
        event_date: eventDate,
        start_time: "09:00",
        end_time: "11:00",
        capacity: 50,
        category: "Technology",
      }),
    });
    const body = await json(res);
    assert.ok(
      res.status === 200 || res.status === 201,
      `create event: ${JSON.stringify(body)}`
    );
    eventId = body.id;
    assert.deepEqual(body.speaker_ids, [sp1.id, sp2.id]);
    assert.equal(body.speaker_id, sp1.id, "lead should be first id");
    assert.ok(
      String(body.speaker || "").includes(sp1.full_name.split(" ")[0]) ||
        String(body.speaker || "").length > 0,
      "display speaker string set"
    );
    console.log("OK create event", eventId);
    console.log("   speaker_ids:", body.speaker_ids);
    console.log("   speaker_id (lead):", body.speaker_id);
    console.log("   speaker:", body.speaker);
  }

  // 3) Both speakers on roster
  {
    const participants = JSON.parse(
      fs.readFileSync(path.join(dataDir, "participants.json"), "utf8")
    );
    const roster = participants.filter(
      (p) => p.event_id === eventId && p.status !== "cancelled"
    );
    const emails = new Set(roster.map((p) => p.email.toLowerCase()));
    assert.ok(
      emails.has(sp1.email.toLowerCase()),
      `${sp1.email} not on roster`
    );
    assert.ok(
      emails.has(sp2.email.toLowerCase()),
      `${sp2.email} not on roster`
    );
    console.log("OK both speakers auto-rostered (", roster.length, "rows)");
  }

  // 4) GET event returns normalized speaker_ids
  {
    const res = await fetch(`${BASE}/api/events/${eventId}`, {
      headers: { Cookie: jar.header() },
    });
    const body = await json(res);
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.deepEqual(body.speaker_ids, [sp1.id, sp2.id]);
    console.log("OK GET event speaker_ids");
  }

  // 5) Update: reorder lead to sp2
  {
    const res = await fetch(`${BASE}/api/events/${eventId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: jar.header(),
      },
      body: JSON.stringify({
        title: `Multi-speaker test ${Date.now()} (reordered)`,
        description: "Automated multi-speaker smoke test — safe to delete.",
        speaker_ids: [sp2.id, sp1.id],
        event_type: "seminar",
        location: "Test Hall",
        platform_link: "",
        platform_name: "",
        event_date: eventDate,
        start_time: "09:00",
        end_time: "11:00",
        capacity: 50,
        category: "Technology",
      }),
    });
    const body = await json(res);
    assert.equal(res.status, 200, `update: ${JSON.stringify(body)}`);
    assert.deepEqual(body.speaker_ids, [sp2.id, sp1.id]);
    assert.equal(body.speaker_id, sp2.id);
    console.log("OK update lead reorder →", body.speaker_id);
  }

  // 6) Reject empty speakers
  {
    const res = await fetch(`${BASE}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jar.header(),
      },
      body: JSON.stringify({
        title: "Should fail",
        speaker_ids: [],
        event_type: "seminar",
        location: "X",
        event_date: eventDate,
        start_time: "09:00",
        end_time: "10:00",
        capacity: 10,
        category: "Technology",
      }),
    });
    assert.equal(res.status, 400, "empty speakers should 400");
    console.log("OK reject empty speaker_ids");
  }

  // 7) Second speaker email login sees topic (session + events list filter)
  {
    const spJar = cookieJar();
    const login = await fetch(`${BASE}/api/auth/speaker-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sp2.email }),
    });
    spJar.store(login);
    const loginBody = await json(login);
    assert.equal(login.status, 200, `speaker login: ${JSON.stringify(loginBody)}`);

    const list = await fetch(`${BASE}/api/events?organizer_id=${sp2.id}`, {
      headers: { Cookie: spJar.header() },
    });
    const events = await json(list);
    assert.equal(list.status, 200, JSON.stringify(events));
    const mine = Array.isArray(events)
      ? events
      : events.events || events.data || [];
    const found = mine.find((e) => e.id === eventId);
    assert.ok(
      found,
      `speaker ${sp2.email} should see event in organizer filter`
    );
    assert.ok(
      (found.speaker_ids || []).includes(sp2.id),
      "event should list sp2 in speaker_ids"
    );
    console.log("OK co-speaker sees topic via events API");
  }

  // 8) Cleanup — delete test event
  {
    const res = await fetch(`${BASE}/api/events/${eventId}`, {
      method: "DELETE",
      headers: { Cookie: jar.header() },
    });
    assert.ok(res.status === 200 || res.status === 204, `delete ${res.status}`);
    console.log("OK cleaned up test event");
  }

  console.log("\nAll multi-speaker live checks passed.");
}

main().catch((err) => {
  console.error("\nFAIL:", err.message || err);
  process.exit(1);
});
