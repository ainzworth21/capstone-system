# Backups

Two kinds of local backup live here:

1. **Data snapshots** (`snapshots/`) — JSON data + uploaded files. Use to restore
   users/events/certificates without touching code.
2. **Code versions** (`versions/`) — a full copy of the app source. Use to roll
   back to a previous **working version** if the current one breaks.

```
backup/
  README.md
  LATEST.txt                         # newest data snapshot stamp
  snapshots/
    YYYY-MM-DD_HHMM/                 # data + uploads folder copy
      data/  public/…  backup-meta.json
    cvsu-events-backup-….zip
  versions/
    LATEST.txt                       # newest code version label
    YYYY-MM-DD_HHMM/                 # full source copy (no node_modules/.next)
      app/ components/ lib/ public/ … version-meta.json
    YYYY-MM-DD_HHMM.zip
```

---

## Data snapshot (admin UI)

1. Sign in as **admin**
2. **Users** → **Download system backup**
3. Downloads a ZIP **and** writes a copy under `backup/snapshots/`

### Restore data

1. Stop the dev server.
2. Copy `data/` from a snapshot over the project `data/` folder.
3. Copy `public/speaker-ids`, `public/certificates`, `public/pubmats` the same way.
4. Restart `npm run dev`.

---

## Code version (rollback the whole app)

Create a snapshot **before** risky changes:

```bash
npm run backup:version            # timestamped, e.g. 2026-08-05_1527
npm run backup:version stable-v1  # or give it a label
```

Each run writes both a folder and a ZIP under `backup/versions/`.
`node_modules`, `.next`, `.git`, and `backup/` are excluded (reinstall deps after restore).

### Restore a previous version

1. Stop the dev server.
2. Copy the wanted `backup/versions/<label>/` back over the project root
   (or unzip `<label>.zip`), overwriting current files.
3. Reinstall dependencies and restart:

```bash
npm install
npm run dev
```

The snapshot includes `data/` and `.env.local`, so a restore brings back the
matching data and secrets for that version.

---

Snapshot and version contents are gitignored; keep this `README.md`.
For real version history, install **git** and commit — that is the proper tool
for rollback. These folder/ZIP backups are a git-free fallback for the lab.
