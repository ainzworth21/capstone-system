import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { readDB, writeDB, insertOne, updateOne, deleteOne } from "@/lib/db";
import { Pubmat } from "@/lib/types";
import { generateId, now } from "@/lib/utils";
import fs from "fs";
import path from "path";

export async function GET() {
  const items = readDB<Pubmat>("pubmats").sort(
    (a, b) =>
      a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
  );
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const caption = String(body.caption ?? "").trim();
  const image_filename = String(body.image_filename ?? "").trim();

  if (!image_filename) {
    return NextResponse.json(
      { error: "Please upload a pubmat image." },
      { status: 400 }
    );
  }

  const existing = readDB<Pubmat>("pubmats");
  const record: Pubmat = {
    id: generateId(),
    title: title || "Announcement",
    caption,
    image_filename,
    sort_order: existing.length,
    is_active: body.is_active !== false,
    created_at: now(),
    updated_at: now(),
  };
  insertOne("pubmats", record);
  return NextResponse.json(record, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const id = String(body.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const found = updateOne<Pubmat>(
    "pubmats",
    (p) => p.id === id,
    (p) => ({
      ...p,
      title:
        body.title !== undefined
          ? String(body.title).trim() || "Announcement"
          : p.title,
      caption:
        body.caption !== undefined ? String(body.caption).trim() : p.caption,
      image_filename:
        body.image_filename !== undefined
          ? String(body.image_filename).trim()
          : p.image_filename,
      is_active:
        body.is_active !== undefined ? !!body.is_active : p.is_active,
      sort_order:
        body.sort_order !== undefined
          ? Number(body.sort_order)
          : p.sort_order,
      updated_at: now(),
    })
  );

  if (!found) {
    return NextResponse.json({ error: "Pubmat not found." }, { status: 404 });
  }

  const updated = readDB<Pubmat>("pubmats").find((p) => p.id === id);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const items = readDB<Pubmat>("pubmats");
  const item = items.find((p) => p.id === id);
  if (!item) {
    return NextResponse.json({ error: "Pubmat not found." }, { status: 404 });
  }

  deleteOne<Pubmat>("pubmats", (p) => p.id === id);

  if (item.image_filename) {
    const base = path.basename(item.image_filename);
    if (base === item.image_filename && !base.includes("..")) {
      try {
        fs.unlinkSync(path.join(process.cwd(), "public", "pubmats", base));
      } catch {
        /* ignore missing file */
      }
    }
  }

  const remaining = readDB<Pubmat>("pubmats")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p, i) => ({ ...p, sort_order: i }));
  writeDB("pubmats", remaining);

  return NextResponse.json({ ok: true });
}
