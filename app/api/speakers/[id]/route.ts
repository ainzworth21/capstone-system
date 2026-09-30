import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { findOne, updateOne } from "@/lib/db";
import { User } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const target = findOne<User>("users", (u) => u.id === id);
  if (!target || target.role !== "organizer") {
    return NextResponse.json({ error: "Speaker not found." }, { status: 404 });
  }

  const body = await req.json();
  const full_name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const title_position = String(body.title_position ?? "").trim();
  const affiliation = String(body.affiliation ?? "").trim();
  const bio = String(body.bio ?? "").trim();
  const speaker_active = !!body.speaker_active;

  if (!full_name || !email) {
    return NextResponse.json(
      { error: "Full name and email are required." },
      { status: 400 }
    );
  }

  const emailTaken = findOne<User>(
    "users",
    (u) => u.email.toLowerCase() === email && u.id !== id
  );
  if (emailTaken) {
    return NextResponse.json(
      { error: "Another account already uses that email." },
      { status: 409 }
    );
  }

  updateOne<User>(
    "users",
    (u) => u.id === id,
    (u) => ({
      ...u,
      full_name,
      email,
      title_position: title_position || null,
      affiliation: affiliation || null,
      bio: bio || null,
      speaker_active,
    })
  );

  return NextResponse.json({ success: true, message: "Speaker updated." });
}
