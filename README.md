# CvSU Campus Event Management System — Next.js
**ITEC 106 – Web Systems and Technologies 2 | Final Project**
Cavite State University – Don Severino delas Alas Campus

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Install on Another PC](#install-on-another-pc)
5. [Default Credentials](#default-credentials)
6. [User Roles](#user-roles)
7. [Event Types](#event-types)
8. [Feature List](#feature-list)
9. [Project Structure](#project-structure)
10. [Data Storage](#data-storage)
11. [Pages](#pages)
12. [API Routes](#api-routes)
13. [Security](#security)
14. [Admin User Management — Design Decision](#admin-user-management--design-decision)
15. [Free hosting & email (production)](#free-hosting--email-production)
16. [Production checklist](#production-checklist)
17. [Changelog](#changelog)
18. [Implementation Plan](./IMPLEMENTATION_PLAN.md) — phased improvements roadmap

---

## Overview

A full-stack web application built with **Next.js 16 (App Router)** and **JSON file storage** — no external database required. The system focuses on **Webinars and Seminars** for Cavite State University and supports three roles: **Admin**, **Speaker** (organizer), and **Participant** (student).

**Speakers use the participant portal** (same login experience as students) with an extra **Host Events** section. Admin tools (reporting, global settings, users) stay admin-only. Hosted events link to admin Speakers and STAR reports via `speaker_id` / `organizer_id`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + Custom CSS (gold & green enterprise theme) |
| Auth / Sessions | iron-session v8 (encrypted cookie) |
| Password Hashing | bcryptjs (cost 12) |
| IDs & Tokens | uuid v4 |
| QR Generation | qrcodejs@1.0.0 (CDN, browser-native) |
| QR Scanning | jsQR@1.4.0 (CDN) |
| Charts | Chart.js@4.4.0 (CDN) |
| Certificate Canvas | HTML5 Canvas API |
| Storage | JSON files in `/data/` directory |

---

## Getting Started

### Requirements

| Software | Version | Notes |
|---|---|---|
| **Node.js** | **20 LTS or newer** (22 OK) | Includes `npm`. Download: https://nodejs.org |
| OS | Windows, macOS, or Linux | No MySQL/PHP required — data is JSON files |

Check versions:

```bash
node -v
npm -v
```

### Run locally (this PC)

```bash
# Open a terminal in the nextjs/ folder (the folder that contains package.json)
cd path/to/nextjs
npm install
npm run dev
```

Optional helpers:

```bash
npm run seed:demo            # add 3 demo events (fails if catalog not empty)
npm run seed:demo -- --force
npm run backup:version       # full code-version snapshot under backup/versions/
```

Open **http://localhost:3000**

### Environment

Create a file named `.env.local` in the `nextjs/` folder (optional in development):

```env
SESSION_SECRET=your-secret-at-least-32-characters-long!!
```

- **Development:** if `SESSION_SECRET` is missing, a fixed dev-only secret is used.
- **Production:** `SESSION_SECRET` (≥ 32 characters) is **required** or the app will not start.

### Build for Production

```bash
npm run build
npm start
```

---

## Install on Another PC

Use these steps to set up the project on a classmate’s or lab computer.

### 1. Copy the project

**Option A — USB / zip (no Git)**

1. On the source PC, copy the whole **`nextjs`** folder (or the parent `FinalProject-ITEC106` folder).
2. **Do not rely on copying `node_modules`** — it is large and often breaks across machines. Prefer deleting it before zipping, or leave it out of the zip.
3. Also skip copying the build cache if present: `.next/` (optional; it will regenerate).
4. Paste the folder on the new PC (example: `C:\Projects\cvsu-events\nextjs` or under WAMP `C:\wamp64\www\...`).

**What to include**

| Include | Skip (reinstall / regenerate) |
|---|---|
| `app/`, `components/`, `lib/`, `public/`, `data/` | `node_modules/` |
| `package.json`, `package-lock.json` | `.next/` |
| `README.md`, config files (`tsconfig.json`, etc.) | Old `.env.local` secrets if sharing publicly |

**Option B — Git clone** (if the project is on GitHub/GitLab)

```bash
git clone <your-repo-url>
cd nextjs
```

### 2. Install Node.js on the new PC

1. Install **Node.js 20+** from https://nodejs.org (LTS recommended).
2. Restart the terminal (or PC) after install.
3. Confirm:

```bash
node -v
npm -v
```

> **Note:** WAMP/XAMPP is **not required** for this Next.js app. Apache/MySQL are unused. You only need Node.js.

### 3. Install dependencies

Open a terminal **inside** the `nextjs` folder (where `package.json` is):

**Windows (PowerShell or CMD)**

```bash
cd C:\path\to\nextjs
npm install
```

**macOS / Linux**

```bash
cd /path/to/nextjs
npm install
```

Wait until `npm install` finishes with no errors. This creates a fresh `node_modules/` for that PC.

### 4. Create `.env.local` (recommended)

In the `nextjs` folder, create `.env.local`:

```env
SESSION_SECRET=change-this-to-a-long-random-string-32chars+
```

Use any string **at least 32 characters**. Each PC can have its own secret for local testing.

### 5. Start the app

```bash
npm run dev
```

You should see something like:

```text
▲ Next.js …
- Local: http://localhost:3000
```

Open a browser to **http://localhost:3000**

### 6. Log in

This repository does not include user accounts or runtime database records. Set up an administrator securely for your environment before signing in at `/login/admin`; do not commit `data/*.json` or reuse demo credentials in a deployed environment.

**Speakers / participants:** use **Create Account** on `/register`, then (for speakers) wait for admin approval under **Users**. After approval, speakers land on `/speaker/dashboard`.

### 7. Stop the server

In the terminal: press `Ctrl + C`.

### Optional — production mode on that PC

```bash
npm run build
npm start
```

Then open **http://localhost:3000** (default port).

### Troubleshooting (new PC)

| Problem | Fix |
|---|---|
| `node` / `npm` not recognized | Reinstall Node.js; close and reopen the terminal; on Windows ensure “Add to PATH” was checked |
| `npm install` fails | Delete `node_modules` and `package-lock.json`, then run `npm install` again; check internet |
| Port 3000 in use | Run `npx next dev -p 3001` and open http://localhost:3001 |
| Blank / module errors after copy | Delete `node_modules` and `.next`, then `npm install` and `npm run dev` again |
| Login / session odd after copy | Create a new `.env.local` with a fresh `SESSION_SECRET` and restart `npm run dev` |
| Cannot find `package.json` | You are in the wrong folder — `cd` into the `nextjs` directory that contains `package.json` |

### Quick checklist

- [ ] Node.js 20+ installed (`node -v`)
- [ ] Project folder copied (without relying on old `node_modules`)
- [ ] `cd` into `nextjs`
- [ ] `npm install`
- [ ] `.env.local` created (optional for dev, required for production)
- [ ] `npm run dev`
- [ ] Browser → http://localhost:3000
- [ ] Provision an admin account securely, then sign in at `/login/admin`

---

## Initial Admin Account

No admin credentials are published in this repository. User accounts and runtime records are stored under ignored `data/*.json` files, so a fresh checkout requires secure initial admin setup before use. Keep credentials outside Git and never deploy with demo passwords.

Speakers and participants are created via **Create Account** (`/register`). Approve speakers in **Admin → Users** before they can sign in.

---

## User Roles

| UI label | Role key | After login | Capabilities |
|---|---|---|---|
| **Admin · Secretariat** | `admin` | `/dashboard` | Full staff tools — events, settings, speakers, users, reporting, completion, certificates |
| **Speaker** | `organizer` | `/speaker/dashboard` | Native **Speaker Portal** — host events (My Hosted Events / Create / Manage / Quiz / Roster) and also browse/register as a guest |
| **Participant** | `student` | `/student/dashboard` | Native **Participant Portal** — browse, register, pre-assessment, survey, quiz, certificate |

- Speakers must be **approved** by an admin before they can log in.
- Participants are **auto-approved** on registration.
- Speakers are **not** admins — `/dashboard/*` redirects them to `/speaker/dashboard`.
- Participants typing `/dashboard` or `/speaker` are sent to `/student/dashboard`.
- Admin-created events with a selected speaker also auto-register that speaker and appear under **Admin → Speakers** and **Reporting → Star Report**.
- Public signup cannot create an `admin` account.

---

## Event Types

### Seminar
- Physical event at a venue
- Requires **Venue / Location**
- Attendance via **QR code** scan

### Webinar
- Online event
- Requires **Platform** and **Meeting Link**
- Attendance via **self-confirmation** link
- Meeting link shown after registration

Both types support a linked **Speaker** account and optional speaker certificate issuance.

---

## Feature List

### 1. Authentication & Accounts
- Create Account: **Participant** or **Speaker** (ID photo required for speakers)
- Name fields: Prefix (speakers), First, Last, M.I., Suffix
- Participants also set designation, ID number, course/program, year level
- Login redirects by role; pending/rejected speakers blocked
- Login rate limiting against brute-force (failed attempts only)
- Registration success modal (complete vs speaker pending); submit button stays disabled after success
- **Forgot password** (participants & speakers): one-time reset token; demo shows the reset link on screen (stand-in for email); admins are excluded from this flow
- **Change password** from portal/admin nav (`/change-password`)
- **In-app notifications** (bell): speaker approved, event created, certificate issued
- Admin **Load demo events** / `npm run seed:demo` for empty (or forced) catalogs
- Roster **attendance snapshot** (Registered / Attended / Waitlist) with link to attendance tool

### 2. Landing Page — Events & Announcements
- Public home tabs: **Events** | **Announcement**
- Announcements (pubmats) managed in **Global Settings → Announcement** (admin)

### 3. Event Management
- **Admin:** create/edit/soft-cancel from `/dashboard/events`; select a registered speaker
- **Speaker:** create/edit from `/speaker/hosted` and `/speaker/hosted/create` (always set as resource speaker)
- Shareable registration link: `/register/[token]`
- Status auto-transitions: `upcoming → ongoing → completed`
- **View Roster** from the admin events list → participants for that event (with speaker card)
- Public **All Events** (`/events`): search/filter; speakers see Create Event when the list is empty

### 4. Event Registration
- Flexible demographics: designation (Faculty, Student, Staff, Speaker, …), organization, country, institution, age
- Flow: **Register → Pre-Assessment (if configured) → Confirmation** (QR or webinar confirm)
- Waitlist when capacity is full
- Speakers auto-registered on their hosted events appear on the roster as designation **Speaker**

### 5. Global Settings (`/dashboard/settings`) — Admin only
| Tab | Purpose |
|---|---|
| **Pre-Assessment** | Universal 5-question pre-form for all events |
| **Survey** | Universal post-event evaluation + Active/Inactive |
| **Certificate** | Student + Speaker certificate designs (two sub-tabs), live preview + QR seal |
| **Announcement** | Landing-page announcement posters |
| **Categories** | Shared event category list (add/remove) |

Quizzes stay **per event** (speaker Hosted Events quiz editor, or admin Manage Event → Quiz).

### 6. Survey & Quiz (post-event)
- Survey: one submission per participant; gated by Active toggle
- Quiz: auto-graded, passing score, one attempt; correct answers never sent to participants
- Preview URLs available for admins (read-only)

### 7. Certificates
- Designs live under **Global Settings → Certificate**
- Manage Event → Certificate: issue student/speaker certificates when eligible
- Unlock typically requires: attended + survey (if active) + quiz passed (if active)
- Cert Monitor / Missing Certs dashboards for admin

### 8. Attendance
- Seminar: camera QR scan or manual mark (event host/admin only)
- Webinar: self-confirm via attendance token

### 9. Reporting (Admin)
- Survey Results, Summary, Inbound CvSU Students, **Star Report**
- Multiple CSV exports (summary, survey, STAR, completion, speakers, eval, inbound, missing certs)
- **Star Report** filters by linked speaker (`speaker_id`) with per-event pre/post/quiz columns
- Host-scoped filters match events where the user is **organizer or assigned speaker**
- Auto-registered resource speakers are **excluded** from Inbound CvSU student counts

### 10. Speakers & Users
- **Admin → Speakers:** directory of speaker accounts and their hosted/assigned events (`organizer_id` or `speaker_id`)
- Profile edit, quiz questions per event
- Admin can **approve / reject / set pending** speaker accounts
- Admin can **delete** user accounts (not self; not the last admin)

### 11. Speaker portal (Host Events)
- Sidebar: participant links + **My Hosted Events** / **Create Event**
- Dashboard shows hosted stats and recent hosted events
- My Registrations distinguishes guest registrations vs hosted (As Speaker badge)

---

## Project Structure

```
nextjs/
├── app/
│   ├── page.tsx                          # Landing — Events | Announcement
│   ├── login/ · register/
│   ├── forgot-password/ · reset-password/   # Demo token reset (no SMTP)
│   ├── events/ · event/[id]/
│   ├── register/[token]/                 # Event registration
│   ├── pre-assessment/[eventId]/
│   ├── confirmation/ · cancel/[token]/
│   ├── dashboard/                        # Admin area (AdminTopNav)
│   │   ├── events/ · participants/ · attendance/
│   │   ├── settings/                     # Global Settings tabs
│   │   ├── reports/ · completion/ · evaluations/
│   │   ├── certificates/ · certificates/missing/
│   │   ├── speakers/ · users/ · questions/
│   │   └── eval/[eventId]/
│   ├── student/                          # Participant portal only
│   │   ├── dashboard/ · browse/ · my-events/
│   │   ├── survey/ · quiz/ · certificate/
│   ├── speaker/                          # Speaker portal only
│   │   ├── dashboard/ · browse/ · my-events/
│   │   ├── hosted/ · hosted/create/ · hosted/[id]/
│   │   ├── survey/ · quiz/ · certificate/
│   └── api/                              # Route handlers (see API Routes)
├── components/
│   ├── AdminTopNav.tsx · Navbar.tsx · CvsuLogo.tsx
│   └── HomeContentTabs.tsx · …
├── lib/
│   ├── db.ts · session.ts · authz.ts · types.ts · utils.ts
│   ├── speaker-registration.ts · speaker-portal.ts
│   ├── registration-fields.ts · certificates.ts · reporting.ts
│   └── star-report.ts · speakers.ts · completion.ts · …
├── data/                                 # JSON "database"
├── public/
│   ├── certificates/ · pubmats/ · speaker-ids/
│   └── cvsu-logo.png
└── .env.local                            # SESSION_SECRET
```

---

## Data Storage

All data is stored as JSON in `/data/`. Helpers in `lib/db.ts`:

```ts
readDB<T>(name)
writeDB<T>(name, data)
findOne<T>(name, pred)
insertOne<T>(name, item)
updateOne<T>(...)
deleteOne<T>(...)
```

Key files include: `users.json`, `events.json`, `participants.json`, `categories.json`, `password_resets.json`, `quizzes.json`, `universal_survey.json`, `universal_certificate.json`, `pubmats.json`, `issued_certificates.json`, `issued_speaker_certificates.json`, and response/attempt logs. Speaker certificate settings are stored when first saved from Global Settings (`universal_speaker_certificate.json`).

### Event Object Shape

```ts
{
  id, title, description,
  event_type: "webinar" | "seminar",
  location,        // seminar venue
  platform_link,   // webinar URL
  platform_name,   // e.g. "Zoom"
  speaker,         // display name (from linked speaker profile)
  speaker_id,      // linked organizer user id (required for reporting/Speakers)
  event_date, start_time, end_time,
  capacity, status, registration_token,
  organizer_id,    // creator (admin or speaker)
  category, created_at
}
```

Speaker-hosted events set **both** `organizer_id` and `speaker_id` to the speaker’s user id. Admin reports and the Speakers directory match either field.

---

## Pages

| Page | URL | Access |
|---|---|---|
| Home | `/` | Public |
| Events | `/events` | Public |
| Event Detail | `/event/[id]` | Public |
| Login / Create Account | `/login` · `/register` | Public |
| Forgot / Reset password | `/forgot-password` · `/reset-password?token=…` | Public (participant & speaker) |
| Change password | `/change-password` | Logged-in (nav links in portals + admin; forced after admin temp reset) |
| Event Registration | `/register/[token]` | Public |
| Pre-Assessment | `/pre-assessment/[eventId]?participant_id=X` | After registering |
| Confirmation + QR | `/confirmation?pid=X` | Public |
| Cancel | `/cancel/[token]` | Public |
| Admin Dashboard | `/dashboard` | Admin |
| Events · Create · Edit · Manage | `/dashboard/events…` | Admin |
| Global Settings | `/dashboard/settings` | Admin |
| Participants (roster) | `/dashboard/participants?event_id=X` | Admin |
| Attendance | `/dashboard/attendance?event_id=X` | Admin |
| Reporting | `/dashboard/reports` | Admin |
| Completion · Evaluations · Cert Monitor | `/dashboard/completion` etc. | Admin |
| Speakers · Users · Audit | `/dashboard/speakers` · `/dashboard/users` · `/dashboard/audit` | Admin |
| Participant / Speaker portals | `/student/…` · `/speaker/…` | Participant · Speaker (separate native portals) |
| Participant dashboard · browse · registrations | `/student/dashboard` · `/browse` · `/my-events` | Participant |
| Speaker dashboard · hosted events | `/speaker/dashboard` · `/speaker/hosted…` | Speaker |
| Speaker as guest | `/speaker/browse` · `/speaker/my-events` · survey/quiz/cert | Speaker |
| Manage / Edit / Roster / Attendance | `/speaker/hosted/[id]…` | Speaker (own events) |

---

## API Routes

### Auth & users
| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/login` · `/logout` · `/register` | Register roles: `student` \| `organizer` only; login returns `must_change_password` when set |
| POST | `/api/auth/forgot-password` | Participant/speaker (approved); Resend email when `RESEND_API_KEY` set; else demo `resetUrl` |
| POST | `/api/auth/reset-password` | One-time token; password ≥ 8; bcrypt cost 12 |
| POST | `/api/auth/change-password` | Session required; clears `must_change_password`; returns portal `redirectTo` |
| GET | `/api/auth/me` | Current session |
| GET | `/api/users` | Admin only |
| DELETE | `/api/users` | Admin only — body `{ user_id }`; cannot delete self or last admin |
| POST | `/api/users/reset-password` | Admin only — temp password once; sets `must_change_password` (not self / not admin) |
| PATCH | `/api/users/status` | Approve/reject speakers (admin); creates approval notification |
| GET | `/api/admin/backup` | Admin only — writes `backup/snapshots/<stamp>/` + ZIP; also downloads the ZIP; audit logged |
| GET/POST | `/api/admin/seed-demo` | Admin — load 3 demo events (`force` when catalog not empty) |
| GET | `/api/notifications` | Session — list + unread count |
| POST | `/api/notifications/mark-read` | Session — `{ id }` or `{ all: true }` |

### Events & registration
| Method | Route | Notes |
|---|---|---|
| GET/POST | `/api/events` | List / create — speakers force `speaker_id` = self; auto-register speaker on roster |
| GET/PUT/DELETE | `/api/events/[id]` | Host = organizer **or** assigned speaker; soft-cancel supported |
| GET | `/api/events/token/[token]` · `/statuses` | Public token + polling |
| GET/POST | `/api/categories` | Shared categories; DELETE by name (admin) |
| GET/POST | `/api/participants` | GET requires auth; scoped by role; tokens stripped |
| POST | `/api/participants/cancel` | Cancel by token |

### Attendance, forms, certificates
| Method | Route | Notes |
|---|---|---|
| POST | `/api/attendance/scan` · `/manual` | Event ownership required |
| GET | `/api/attendance/confirm` | Webinar self-confirm |
| GET/POST | `/api/settings/pre-assessment` · `/survey` · `/certificate` | POST = **admin only** |
| GET/POST/PUT/DELETE | `/api/settings/pubmat` (+ `/upload`) | Announcements — admin |
| GET/POST | `/api/quiz/[eventId]` · `/quiz/attempt` | Answers hidden unless manager; attempt bound to session |
| GET/POST | `/api/survey/respond` · `/pre-assessment/respond` | Survey requires session; pre-assessment validates participant↔event |
| GET/POST | `/api/certificate/[eventId]` · `/speaker` · `/upload` | Ownership / admin rules apply |
| GET/POST | `/api/feedback` | GET = staff only; POST by feedback token |

### Reports
| Method | Route |
|---|---|
| GET | `/api/reports/export` · `export-summary` · `export-survey` · `export-star` · `export-completion` · `export-eval` · `export-inbound` · `export-speakers` · `export-missing-certs` |

---

## Security

| Area | Behavior |
|---|---|
| Passwords | bcryptjs cost 12 |
| Login rate limit | 5 failed attempts per email+IP / 15 min; 25 failures per IP / 15 min; persisted in `data/login_attempts.json` (`lib/rate-limit.ts`); 429 + countdown on login UI |
| Password reset | One-time token in `password_resets.json` (1 hour); **Resend email** when `RESEND_API_KEY` is set; otherwise demo shows link in-app; admins cannot use this flow |
| Audit log | Append-only `audit_log.json` — user delete, speaker status, admin password reset, backup, certificate issue; `/dashboard/audit` |
| Admin temp password | `POST /api/users/reset-password` — plaintext shown once; user must change password on next login (`must_change_password`) |
| System backup | `GET /api/admin/backup` — saves folder + ZIP under `backup/snapshots/` and downloads the ZIP (`data` + IDs/certs/pubmats) |
| Sessions | iron-session; `httpOnly` cookie; production requires `SESSION_SECRET` ≥ 32 chars |
| Role guards | Layout `redirect()` + per-route `getSessionUser()` checks |
| Authorization | `lib/authz.ts` — `canManageEvent` / `isEventHost` (organizer **or** `speaker_id`), `isStaff`, `publicParticipant` |
| Participants API | Auth required; students see own rows; organizers see events they host; tokens never listed |
| Quiz | `correct_answer` stripped unless user can manage the event |
| Quiz / survey submit | Must match logged-in participant email (or staff with ownership) |
| Attendance / exports | Hosts cannot act on other hosts’ events |
| Global settings writes | Admin only (speakers cannot change universal survey/cert/pre-assessment/announcements/categories) |
| Admin UI | `/dashboard/*` is **admin-only**. Participants → `/student/dashboard`; Speakers → `/speaker/dashboard`. Speakers manage events under `/speaker/hosted/...` |
| Registration | Cannot self-register as `admin` |
| Uploads | MIME + size checks; safe file extensions; path basename on announcement delete |
| User accounts | Admin can delete users (not self / not last admin); reset participant/speaker passwords; speaker status via PATCH |

---

## Admin User Management — Design Decision

### Requirement
> The Admin manages content, speaker **approval**, and may **delete** accounts. Profile fields (name/email/password) are not edited through the Users UI.

### What is allowed
- View all accounts
- Approve / reject / set pending **speaker** accounts (`PATCH /api/users/status`)
- **Reset password** for participants & speakers (`POST /api/users/reset-password`) — temp password shown once; user must change it on login
- **Delete** participant, speaker, or other admin accounts (`DELETE /api/users`)
- **Download system backup** from Users header (`GET /api/admin/backup`) — also writes `backup/snapshots/`

### What is restricted
- No edit of name/email through the Users UI
- Cannot reset **admin** passwords from this screen (or your own)
- Cannot delete **your own** account
- Cannot delete the **last** admin account

### Why
1. Admins can remove test, rejected, or unused accounts without editing JSON by hand
2. Temp passwords recover locked-out participants/speakers when email is unavailable
3. Self-delete and last-admin locks prevent locking out the secretariat
4. Speaker verification stays an admin workflow without full IAM tooling
5. Deleting a speaker clears `speaker_id` on linked events (display name kept) and removes their ID photo file when present
6. Backup ZIP + `backup/snapshots/` folder preserve lab data before demos or deploys (see `backup/README.md`)

---

## Free hosting & email (production)

This project can run on **free** tiers for a public demo. Local/lab use still works with JSON files and the demo password-reset link (no SMTP).

### Recommended free stack (Phase 5 — 1,000+ participants)

| Need | Service | Why |
|------|---------|-----|
| **Hosting** | [Vercel](https://vercel.com) (Hobby) | Built for Next.js; HTTPS; Git deploy; free hobby plan |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (M0) | Durable data on serverless; migrate with `npm run migrate:mongo` |
| **Transactional email** | [Resend](https://resend.com) | Password resets (~3k/month free) — not mass mail to all participants |
| **File uploads** | [Vercel Blob](https://vercel.com/storage/blob) or [Cloudinary](https://cloudinary.com) | Speaker IDs / certificates / pubmats survive deploys |

Performance (lower API ms), API security, and the full Phase 5 build order are in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) § Phase 5E–5F.

**Alternatives (also free / freemium):**

| Need | Options |
|------|---------|
| Hosting | Netlify; Railway / Render (stricter free limits) |
| Database | Supabase / Turso (if you prefer SQL later) |
| Email / SMTP | [Brevo](https://www.brevo.com) (~300/day), [Mailjet](https://www.mailjet.com) (~200/day); Gmail SMTP only for personal tests |

Avoid GitHub Pages for this app — it does not run Next.js API routes well.

### Deploy on Vercel (short)

1. Push the `nextjs` project to GitHub.
2. Import the repo in Vercel → Framework: Next.js (`vercel.json` included).
3. Set environment variables (see below and `.env.example`).
4. Create Atlas cluster → allow network access → run `MONGODB_URI=… npm run migrate:mongo` once from your PC.
5. Deploy. Open the `*.vercel.app` URL.

### Email + database env vars

```env
SESSION_SECRET=at-least-32-characters-long-secret!!
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=CvSU Events <onboarding@resend.dev>
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=cvsu_events
```

- When `RESEND_API_KEY` is set, forgot-password **emails** the reset link (no on-screen demo URL).
- When missing, forgot-password still shows the reset link **on screen** (class demo).
- `lib/mongo.ts` + `lib/db-mongo.ts` + `npm run migrate:mongo` prepare Atlas. Full route cutover to Mongo when `MONGODB_URI` is set is tracked as Phase 5B.1 in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

### Important: JSON `/data` on serverless hosts

On Vercel, the filesystem is **ephemeral** — writes to `/data/*.json` may not persist across deploys or instances.

| Mode | Storage |
|------|---------|
| Local / lab (WAMP path, `npm run dev`) | JSON in `/data/` is fine |
| Public demo on Vercel | Use **MongoDB Atlas** (Phase 5); until cutover is complete, export backups often |
| True production | Atlas + Resend + `SESSION_SECRET`; complete Mongo route switch |

So: **Vercel + MongoDB Atlas + Resend = free public site + durable data + real email**.

---

## Production checklist

Before a defense demo or public deploy:

- [ ] `SESSION_SECRET` ≥ 32 characters (required in production)
- [ ] Never commit `.env.local` or live secrets (see `.gitignore` / `.env.example`)
- [ ] HTTPS via Vercel (or another host with TLS)
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` set for real password-reset email
- [ ] `MONGODB_URI` (+ optional `MONGODB_DB`) set; run `npm run migrate:mongo` after schema/data changes
- [ ] Atlas Network Access allows Vercel (e.g. `0.0.0.0/0` or integration)
- [ ] Download system backup / `npm run backup:version` before risky changes
- [ ] `npm test` passes locally
- [ ] Note: uploaded files under `public/` are not durable on Vercel without Blob/S3 (Phase 5D)

### Scripts

```bash
npm run dev
npm test
npm run seed:demo
npm run seed:demo -- --force
npm run backup:version
npm run migrate:mongo   # requires MONGODB_URI
```

---

## Changelog

### v1.12.0 — Phase 4 + Phase 5 foundations
- **Audit log:** `/dashboard/audit` + hooks on delete / speaker status / temp password / backup / certificates
- **Smoke tests:** `npm test` (rate limit, reset token, admin guard, host authz)
- **Production checklist** + `.env.example` + `vercel.json`
- **Resend:** forgot-password emails when `RESEND_API_KEY` is set
- **MongoDB:** `lib/mongo.ts`, `lib/db-mongo.ts`, `npm run migrate:mongo` (full route cutover = Phase 5B.1)

### v1.11.0 — Phase 3: UX polish
- **Change password** links in student/speaker sidebars and admin top nav
- **Load demo events** (Events page + `npm run seed:demo` / `--force`)
- **In-app notifications** bell (speaker approved, event created, certificate issued)
- **Roster attendance snapshot** — Registered / Attended / Waitlist + attendance link

### v1.10.0 — Phase 1: auth recovery + backup
- **Admin temp password:** Users → Reset password; forces `/change-password` on next login
- **Persistent login rate limits:** `data/login_attempts.json` survives dev restarts
- **System backup ZIP:** `GET /api/admin/backup` from Users header — also writes `backup/snapshots/<stamp>/`

### v1.9.0 — Native student & speaker portals
- **`/student/*`** — participants only (sidebar: Dashboard, Registrations, Browse)
- **`/speaker/*`** — speakers only (Host Events + As Participant tools)
- Shared editors moved to `components/events` and `components/attendance`
- Login / navbar route by role; legacy `/student/hosted` redirects to `/speaker/hosted`

### v1.8.1 — Admin route lock + speaker hosted tools
- **`/dashboard/*` admin-only:** participants and speakers typing admin URLs are redirected to `/student/dashboard`
- Speakers manage events under `/student/hosted/[id]` (Details + Quiz), plus edit / roster / attendance
- Report export APIs restricted to admin

### v1.8.0 — Forgot password (reset tokens)
- **Participants & speakers:** Forgot password → one-time link (demo shown on screen) → set new password
- Tokens stored in `password_resets.json` (1-hour expiry, single use); admins excluded from self-reset

### v1.7.1 — Admin can delete users
- **Users tab:** Delete button per account (confirm dialog); API `DELETE /api/users`
- Guards: cannot delete self or the last admin; clears `speaker_id` on events; removes speaker ID photo file

### v1.7.0 — Speaker portal, reporting linkage, Categories
- **Speaker portal:** speakers log into `/student/dashboard` with Host Events (My Hosted Events / Create Event); admin pages redirect speakers away
- **Create/update event:** speakers always set as `speaker_id`; auto-register on roster (`lib/speaker-registration.ts`); hosts may manage by `organizer_id` **or** `speaker_id`
- **Admin reporting:** survey/summary/completion/STAR/inbound/missing-certs/cert-monitor include speaker-hosted events; STAR filters by `speaker_id`; inbound excludes designation Speaker
- **Global Settings → Categories:** shared category list for event forms
- **Public All Events:** sticky footer layout; empty-state CTAs for speakers (Create Event / My Hosted Events)
- **Certificates:** live preview, QR seal, name auto-fit on student/speaker templates

### v1.6.0 — Security hardening, Global Certificate & Announcements, roster
- **Security:** authz helpers; participants/feedback/export/attendance ownership; admin-only global settings writes; quiz answers stripped; quiz/survey attempts session-bound; production `SESSION_SECRET` required; safe uploads
- **Global Settings → Certificate:** Student + Speaker design tabs (`universal_certificate` / speaker template)
- **Global Settings → Announcement:** landing-page posters (`pubmats`)
- **Registration:** Participant label, structured name fields, designation dropdown
- **Events:** View Roster → `/dashboard/participants?event_id=…`
- **Reporting:** STAR speaker filter improvements
- **Admin top bar:** Admin · Secretariat + greeting; CvSU logo branding on login/register

### v1.5.0 — Universal Settings & category accordion
- Global Settings for universal pre-assessment, survey, and certificate
- Admin events list grouped by category when large
- Pre-assessment after registration when universal form exists

### v1.4.0 — Category accordion in My Registrations
- Student My Registrations grouped by category

### v1.3.0 — Pre-Assessment, Survey, Quiz, Certificate, Event Detail
- Full post-event learning pipeline and canvas certificates

### v1.2.0 — Webinar attendance confirmation
- QR for seminars; self-confirm for webinars

### v1.1.0 — Webinar/Seminar focus & dynamic categories

### v1.0.0 — Initial Next.js release
- Port from PHP/MySQL to Next.js 16 + JSON storage
- Admin / Organizer / Student roles, events, QR, reports