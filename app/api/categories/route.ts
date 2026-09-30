import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const cats = readDB<string>("categories");
  return NextResponse.json(cats.sort());
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return NextResponse.json(
      { error: "Category name is required." },
      { status: 400 }
    );
  }

  const cats = readDB<string>("categories");
  if (cats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    return NextResponse.json(
      { error: "Category already exists." },
      { status: 409 }
    );
  }

  cats.push(trimmed);
  writeDB("categories", cats.sort());
  return NextResponse.json(cats.sort(), { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { oldName, newName } = await req.json();
  const current = String(oldName ?? "").trim();
  const next = String(newName ?? "").trim();

  if (!current || !next) {
    return NextResponse.json(
      { error: "Both the current and new module names are required." },
      { status: 400 }
    );
  }

  const cats = readDB<string>("categories");
  const existingIndex = cats.findIndex((c) => c.toLowerCase() === current.toLowerCase());
  if (existingIndex === -1) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }
  if (cats.some((c) => c.toLowerCase() === next.toLowerCase() && c.toLowerCase() !== current.toLowerCase())) {
    return NextResponse.json({ error: "Module already exists." }, { status: 409 });
  }

  cats[existingIndex] = next;
  writeDB("categories", cats.sort());
  return NextResponse.json(cats.sort());
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = new URL(req.url).searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json(
      { error: "Category name is required." },
      { status: 400 }
    );
  }

  const cats = readDB<string>("categories");
  const next = cats.filter((c) => c.toLowerCase() !== name.toLowerCase());
  if (next.length === cats.length) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  writeDB("categories", next.sort());
  return NextResponse.json(next.sort());
}
