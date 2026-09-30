import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { insertOne, readDB, writeDB } from "@/lib/db";
import { Bridge } from "@/lib/types";
import { generateId, now } from "@/lib/utils";

export async function GET() {
  const bridges = readDB<Bridge>("bridges").sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  return NextResponse.json(bridges);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const partnerName = String(body.partner_name ?? "").trim();
  if (!title || !partnerName) {
    return NextResponse.json(
      { error: "Bridge title and collaborating university are required." },
      { status: 400 }
    );
  }

  const bridges = readDB<Bridge>("bridges");
  if (bridges.some((bridge) => bridge.title.toLowerCase() === title.toLowerCase())) {
    return NextResponse.json(
      { error: "A bridge with this title already exists." },
      { status: 409 }
    );
  }

  const bridge: Bridge = {
    id: generateId(),
    title,
    partner_name: partnerName,
    is_active: true,
    created_at: now(),
  };
  insertOne("bridges", bridge);
  return NextResponse.json(bridge, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = String(body.id ?? "").trim();
  if (!id || typeof body.is_active !== "boolean") {
    return NextResponse.json({ error: "Bridge ID and active status are required." }, { status: 400 });
  }

  const bridges = readDB<Bridge>("bridges");
  const index = bridges.findIndex((bridge) => bridge.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Bridge not found." }, { status: 404 });
  }

  bridges[index] = { ...bridges[index], is_active: body.is_active };
  writeDB("bridges", bridges);
  return NextResponse.json(bridges[index]);
}