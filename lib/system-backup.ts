import fs from "fs";
import path from "path";

export const BACKUP_PUBLIC_FOLDERS = [
  "speaker-ids",
  "certificates",
  "pubmats",
] as const;

export function projectRoot(): string {
  return process.cwd();
}

export function backupRoot(): string {
  return path.join(projectRoot(), "backup");
}

export function backupStamp(date = new Date()): string {
  // Local-friendly folder name: 2026-08-05_1512
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

/**
 * Write a folder snapshot under `backup/snapshots/<stamp>/`
 * containing `data/` and selected `public/` upload folders.
 */
export function writeSystemBackupFolder(stamp = backupStamp()): {
  stamp: string;
  folderPath: string;
} {
  const root = projectRoot();
  const folderPath = path.join(backupRoot(), "snapshots", stamp);
  fs.mkdirSync(folderPath, { recursive: true });

  const dataSrc = path.join(root, "data");
  const dataDest = path.join(folderPath, "data");
  copyDirRecursive(dataSrc, dataDest);

  for (const folder of BACKUP_PUBLIC_FOLDERS) {
    const src = path.join(root, "public", folder);
    const dest = path.join(folderPath, "public", folder);
    copyDirRecursive(src, dest);
  }

  const meta = {
    created_at: new Date().toISOString(),
    includes: ["data/", ...BACKUP_PUBLIC_FOLDERS.map((f) => `public/${f}/`)],
    note: "CvSU Events system backup snapshot",
  };
  fs.writeFileSync(
    path.join(folderPath, "backup-meta.json"),
    JSON.stringify(meta, null, 2),
    "utf-8"
  );

  // Pointer to the newest snapshot for quick restore
  fs.writeFileSync(
    path.join(backupRoot(), "LATEST.txt"),
    stamp + "\n",
    "utf-8"
  );

  return { stamp, folderPath };
}
