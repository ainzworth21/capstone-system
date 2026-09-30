import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import { getSessionUser } from "@/lib/session";
import { backupRoot, writeSystemBackupFolder } from "@/lib/system-backup";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Folder snapshot under /backup/snapshots/<stamp>/
  const { stamp, folderPath } = writeSystemBackupFolder();
  const filename = `cvsu-events-backup-${stamp}.zip`;
  const zipPath = path.join(backupRoot(), "snapshots", filename);

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    output.on("close", () => resolve());
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(folderPath, false);
    void archive.finalize();
  });

  writeAuditLog({
    action: "backup_download",
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    target_type: "backup",
    target_id: stamp,
    summary: `Downloaded system backup ${stamp}`,
    meta: { folder: `backup/snapshots/${stamp}`, zip: filename },
  });

  const webStream = Readable.toWeb(
    fs.createReadStream(zipPath)
  ) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Backup-Folder": `backup/snapshots/${stamp}`,
    },
  });
}
