// Full code-version snapshot so a previous working version can be restored
// if the current one breaks. Copies the project source (excluding heavy /
// generated folders) into backup/versions/<stamp>/ and writes a matching ZIP.
//
// Usage:
//   node scripts/backup-version.mjs            # snapshot with timestamp
//   node scripts/backup-version.mjs my-label   # snapshot named backup/versions/my-label

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ZipArchive } from "archiver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Never copy these (generated, huge, or the backups themselves)
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "backup",
  "coverage",
  "out",
  "build",
]);

function stamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

function copyTree(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const base = path.basename(src);
    if (IGNORE_DIRS.has(base)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyTree(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stat.isFile()) {
    fs.copyFileSync(src, dest);
  }
}

async function zipFolder(folderPath, zipPath) {
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

async function main() {
  const label = process.argv[2]?.trim() || stamp();
  const versionsDir = path.join(ROOT, "backup", "versions");
  const folderPath = path.join(versionsDir, label);

  if (fs.existsSync(folderPath)) {
    console.error(`Snapshot "${label}" already exists at ${folderPath}`);
    process.exit(1);
  }

  fs.mkdirSync(folderPath, { recursive: true });

  for (const entry of fs.readdirSync(ROOT)) {
    if (IGNORE_DIRS.has(entry)) continue;
    copyTree(path.join(ROOT, entry), path.join(folderPath, entry));
  }

  const meta = {
    label,
    created_at: new Date().toISOString(),
    kind: "code-version-snapshot",
    excluded: [...IGNORE_DIRS],
    note: "Full project source snapshot for version rollback.",
  };
  fs.writeFileSync(
    path.join(folderPath, "version-meta.json"),
    JSON.stringify(meta, null, 2)
  );

  const zipPath = path.join(versionsDir, `${label}.zip`);
  await zipFolder(folderPath, zipPath);

  fs.writeFileSync(path.join(versionsDir, "LATEST.txt"), label + "\n");

  console.log("Created code-version snapshot:");
  console.log(`  folder: backup/versions/${label}/`);
  console.log(`  zip:    backup/versions/${label}.zip`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
