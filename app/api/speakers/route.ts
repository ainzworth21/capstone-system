import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { readDB } from "@/lib/db";
import { User } from "@/lib/types";

/** Active/approved speakers for event picker. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const speakers = readDB<User>("users")
    .filter(
      (u) =>
        u.role === "organizer" &&
        u.account_status === "approved" &&
        (u.speaker_active ?? true)
    )
    .map((u) => ({
      id: u.id,
      full_name: u.full_name,
      title_position: u.title_position ?? "",
      affiliation: u.affiliation ?? "",
      speaker_active: u.speaker_active ?? true,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return NextResponse.json(speakers);
}
