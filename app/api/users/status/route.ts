import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { findOne, updateOne } from "@/lib/db";
import { AccountStatus, User } from "@/lib/types";
import { createNotification } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { user_id, status } = body as {
    user_id?: string;
    status?: AccountStatus;
  };

  if (!user_id || !status || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json(
      { error: "user_id and valid status are required." },
      { status: 400 }
    );
  }

  const target = findOne<User>("users", (u) => u.id === user_id);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.role !== "organizer") {
    return NextResponse.json(
      { error: "Only speaker accounts can be approved or rejected here." },
      { status: 400 }
    );
  }
  if (target.id === session.id) {
    return NextResponse.json(
      { error: "You cannot change your own account status." },
      { status: 400 }
    );
  }

  updateOne<User>(
    "users",
    (u) => u.id === user_id,
    (u) => ({
      ...u,
      account_status: status,
      speaker_active: status === "approved" ? true : false,
    })
  );

  if (status === "approved") {
    createNotification({
      user_id,
      type: "speaker_approved",
      title: "Speaker account approved",
      body: "You can now log in and host campus events.",
      link: "/speaker/dashboard",
    });
  }

  writeAuditLog({
    action: "speaker_status",
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    target_type: "user",
    target_id: user_id,
    summary: `Set speaker ${target.email} to ${status}`,
    meta: { status, full_name: target.full_name },
  });

  return NextResponse.json({
    success: true,
    message:
      status === "approved"
        ? "Speaker approved. They can now log in."
        : status === "rejected"
          ? "Speaker registration rejected."
          : "Speaker set back to pending.",
  });
}
