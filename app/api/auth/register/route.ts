import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findOne, insertOne } from "@/lib/db";
import { User } from "@/lib/types";
import { generateId, now } from "@/lib/utils";
import { normalizeNameParts } from "@/lib/registration-fields";

/** Public registration is participants only. Speakers are admin-invited. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const first_name = String((body as { first_name?: string }).first_name ?? "");
  const middle_initial = String(
    (body as { middle_initial?: string }).middle_initial ?? ""
  );
  const last_name = String((body as { last_name?: string }).last_name ?? "");
  const name_suffix = String((body as { name_suffix?: string }).name_suffix ?? "");
  const legacy_full_name = String((body as { full_name?: string }).full_name ?? "");
  const email = String((body as { email?: string }).email ?? "");
  const password = String((body as { password?: string }).password ?? "");
  const role = String((body as { role?: string }).role ?? "student");
  const student_id =
    ((body as { student_id?: string }).student_id as string) || null;
  const course = ((body as { course?: string }).course as string) || null;
  const year_level =
    (body as { year_level?: string | number | null }).year_level ?? null;
  const designation =
    ((body as { designation?: string }).designation as string) || null;

  if (role === "organizer") {
    return NextResponse.json(
      {
        error:
          "Speakers cannot self-register. Ask the secretariat to invite your email.",
      },
      { status: 403 }
    );
  }

  if (role !== "student") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const names = normalizeNameParts({
    name_prefix: "",
    first_name: first_name || legacy_full_name,
    middle_initial,
    last_name,
    name_suffix,
  });

  if (!names.first_name || !names.last_name || !email || !password) {
    return NextResponse.json(
      { error: "First name, last name, email, and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (
    !student_id ||
    !course ||
    year_level === null ||
    year_level === undefined ||
    year_level === "" ||
    !String(designation ?? "").trim()
  ) {
    return NextResponse.json(
      {
        error:
          "ID number, designation, course/program, and year level are required.",
      },
      { status: 400 }
    );
  }

  const existing = findOne<User>(
    "users",
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  const user: User = {
    id: generateId(),
    full_name: names.full_name,
    name_prefix: null,
    first_name: names.first_name,
    middle_initial: names.middle_initial || null,
    last_name: names.last_name,
    name_suffix: names.name_suffix || null,
    email: email.toLowerCase(),
    password: hash,
    role: "student",
    account_status: "approved",
    student_id: student_id || null,
    course: course || null,
    year_level:
      year_level === null || year_level === undefined || year_level === ""
        ? null
        : Number(year_level),
    designation: String(designation ?? "").trim() || null,
    id_image: null,
    title_position: null,
    affiliation: null,
    bio: null,
    speaker_active: false,
    created_at: now(),
  };

  insertOne("users", user);

  return NextResponse.json({
    message: "Account created! You can now log in.",
    pending: false,
  });
}
