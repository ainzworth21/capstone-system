import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, or WebP allowed." },
      { status: 400 }
    );
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Max file size is 12MB." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const filename = `pubmat_${generateId().slice(0, 10)}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), "public", "pubmats");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ filename });
}
