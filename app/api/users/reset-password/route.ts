import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findOne, updateOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { User } from "@/lib/types";
import { generateToken } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";

function generateTempPassword(): string {
  // Readable temp password: 12 chars from token alphabet
  const raw = generateToken().slice(0, 12);
  return `Tmp-${raw}`;
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String((body as { user_id?: string }).user_id ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  if (userId === session.id) {
    return NextResponse.json(
      { error: "You cannot reset your own password here." },
      { status: 400 }
    );
  }

  const target = findOne<User>("users", (u) => u.id === userId);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (target.role === "admin") {
    return NextResponse.json(
      { error: "Admin passwords cannot be reset from this screen." },
      { status: 400 }
    );
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 12);

  updateOne<User>(
    "users",
    (u) => u.id === userId,
    (u) => ({
      ...u,
      password: hash,
      must_change_password: true,
    })
  );

  writeAuditLog({
    action: "admin_password_reset",
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    target_type: "user",
    target_id: userId,
    summary: `Issued temporary password for ${target.email}`,
    meta: { full_name: target.full_name },
  });

  return NextResponse.json({
    success: true,
    tempPassword,
    email: target.email,
    full_name: target.full_name,
    message:
      "Temporary password created. Copy it now and give it to the user — it will not be shown again.",
  });
}
