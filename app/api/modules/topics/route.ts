import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ModuleTopicEntry, normalizeTopics } from "@/lib/module-topics";

export async function GET() {
  const entries = readDB<ModuleTopicEntry>("module_topics");
  return NextResponse.json(
    entries
      .map((entry) => ({
        module: entry.module,
        topics: normalizeTopics(entry.topics),
      }))
      .sort((a, b) => a.module.localeCompare(b.module))
  );
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const module = String(body.module ?? "").trim();
  const topic = String(body.topic ?? "").trim();

  if (!module) {
    return NextResponse.json({ error: "Module name is required." }, { status: 400 });
  }

  const entries = readDB<ModuleTopicEntry>("module_topics");
  const next = entries.map((entry) => ({
    module: entry.module,
    topics: normalizeTopics(entry.topics),
  }));

  const match = next.find((entry) => entry.module.toLowerCase() === module.toLowerCase());
  if (match) {
    if (topic) {
      match.topics = normalizeTopics([...match.topics, topic]);
    }
  } else {
    next.push({ module, topics: topic ? [topic] : [] });
  }

  const sorted = next
    .map((entry) => ({
      module: entry.module,
      topics: normalizeTopics(entry.topics).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));

  writeDB("module_topics", sorted);
  return NextResponse.json(sorted);
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const module = String(body.module ?? "").trim();
  const oldModule = String(body.oldModule ?? "").trim();
  const topic = String(body.topic ?? "").trim();
  const oldTopic = String(body.oldTopic ?? "").trim();

  const entries = readDB<ModuleTopicEntry>("module_topics");
  const next = entries.map((entry) => ({
    module: entry.module,
    topics: normalizeTopics(entry.topics),
  }));

  if (oldModule && module && oldModule.toLowerCase() !== module.toLowerCase()) {
    const idx = next.findIndex((entry) => entry.module.toLowerCase() === oldModule.toLowerCase());
    if (idx === -1) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }
    const current = next[idx];
    next.splice(idx, 1);
    next.push({ module, topics: current.topics });
  }

  if (oldTopic && topic) {
    const target = next.find((entry) => entry.module.toLowerCase() === module.toLowerCase());
    if (!target) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }
    target.topics = normalizeTopics(target.topics.filter((value) => value.toLowerCase() !== oldTopic.toLowerCase()));
    target.topics.push(topic);
  }

  const sorted = next
    .map((entry) => ({
      module: entry.module,
      topics: normalizeTopics(entry.topics).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));

  writeDB("module_topics", sorted);
  return NextResponse.json(sorted);
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const module = req.nextUrl.searchParams.get("module")?.trim() ?? "";
  const topic = req.nextUrl.searchParams.get("topic")?.trim() ?? "";

  if (!module) {
    return NextResponse.json({ error: "Module name is required." }, { status: 400 });
  }

  const entries = readDB<ModuleTopicEntry>("module_topics");
  const next = entries.map((entry) => ({
    module: entry.module,
    topics: normalizeTopics(entry.topics),
  }));

  if (topic) {
    const match = next.find((entry) => entry.module.toLowerCase() === module.toLowerCase());
    if (!match) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }
    match.topics = match.topics.filter((value) => value.toLowerCase() !== topic.toLowerCase());
  } else {
    const filtered = next.filter((entry) => entry.module.toLowerCase() !== module.toLowerCase());
    if (filtered.length === next.length) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }
    next.splice(0, next.length, ...filtered);
  }

  const sorted = next
    .filter((entry) => entry.module.trim() || entry.topics.length > 0)
    .map((entry) => ({
      module: entry.module,
      topics: normalizeTopics(entry.topics).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));

  writeDB("module_topics", sorted);
  return NextResponse.json(sorted);
}
