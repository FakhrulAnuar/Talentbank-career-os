# A.S.C.E.N.D.

**Advancing Skills & Career Evolution for Next-Gen Development**

ASCEND is a career-planning web app for **high-school and university students**. Instead of a
busy dashboard full of boxes, the whole experience is a single, continuous journey, the
**Ascent Path** is a path that a student climbs as they build real skills and credentials.

Pick where you are (high school or university), set your interests, complete skill modules,
store your certificates, auto-generate an ATS-friendly resume, and get matched to real
universities or companies. Everything you do raises your **Pathway Score** — a glowing orb
that literally climbs the path with you.

---

## What you can do

| Feature | What it does |
|---|---|
| **Ascent Path** | Your roadmap as one flowing vertical timeline. Completed steps glow, your score-orb climbs, and certificates hang along the path like lanterns. |
| **Profile & Interests** | Set a target field and interests. This personalises your recommendations and pre-fills your resume. New sign-ups start here. |
| **Modules** | A catalog of **real online courses** (Coursera, Khan Academy, LinkedIn Learning, …). Open the course on its provider, then mark it done to earn points and CV tips. |
| **Certificate Vault** | Upload your credentials (PDF/PNG/JPG). Preview images inline, download them anytime. Each certificate adds **+10** to your Pathway Score. |
| **Resume / CV Generator** | Auto-builds a clean, **ATS-friendly** resume from your activity. Edit any section and export to PDF (print). |
| **Targets** | High-schoolers get matched to **universities**; university students to **companies** — each scored against your activity with clear reasons and an official apply link. |

The **Pathway Score** is simply: completed milestone points + completed module points +
(number of certificates × 10). It is always calculated live, so it can never be faked or drift.

---

## Tech stack

- **Frontend:** React 18 + Vite 5 (plain JavaScript/JSX — no TypeScript). One hand-written
  stylesheet with a soft "aurora" gradient + glassmorphism look. No UI framework, no router.
- **Backend:** Node.js + Express 4 (ES modules).
- **Database:** SQLite via **Drizzle ORM** (`better-sqlite3`). A single local file — no database
  server to install.
- **Auth:** email + password with **bcrypt** hashing and secure, server-side sessions
  (an httpOnly cookie — no tokens in the browser).
- **File uploads:** `multer`, saved to local disk behind a small storage interface.

Everything runs locally and offline — there are **no external API keys** required to run it.

---

## Quick start

You need **Node.js 18 or newer** (works on 20/22/24). Check with `node --version`.

The app has two parts — an **API** (`server/`) and a **web app** (`web/`) — so you run two
terminals.

### 1. Start the API (terminal 1)

```bash
cd server
npm install
npm run seed      # creates the database + a demo account
npm run dev       # starts the API at http://localhost:4000
```

### 2. Start the web app (terminal 2)

```bash
cd web
npm install
npm run dev       # opens the app at http://localhost:5173
```

Now open **http://localhost:5173** in your browser.

### 3. Log in

- **Try the demo account:** `demo@ascend.local` / `demo1234`
- **Or create your own:** click *Create an account*, choose High School or University, and
  you'll start on the Profile page.

> **Windows note:** `better-sqlite3` needs a prebuilt binary, which `npm install` fetches
> automatically. If you ever change the database structure, delete `server/ascend.db` and run
> `npm run seed` again.

---

## Project Structure

```
Ascend-v2/
├─ README.md               ← you are here
├─ DESIGN_BLUEPRINT.md     ← the visual identity + original data model
├─ milestones.seed.json    ← the roadmap steps (editable content)
├─ modules.seed.json       ← the course catalog (real course links)
├─ targets.seed.json       ← the universities + companies catalog
│
├─ server/                 ← the API (Express + Drizzle + SQLite)
│  └─ src/
│     ├─ index.js          ← starts the server, sets up the database
│     ├─ db/               ← schema, connection, seed data
│     ├─ routes/           ← the API endpoints (auth, journey, modules, …)
│     ├─ services/         ← the business logic
│     └─ middleware/       ← the "are you logged in?" guard
│
└─ web/                    ← the web app (React + Vite)
   └─ src/
      ├─ App.jsx           ← top-level app + page switching
      ├─ api.js            ← talks to the API
      ├─ styles.css        ← all the styling, in one file
      └─ components/       ← one file per page (Profile, Path, Modules, …)
```

---

## Editing the content (no coding needed)

The roadmap, courses, and target schools/companies live in three plain **JSON files** at the
project root:

- `milestones.seed.json` — the steps on the path
- `modules.seed.json` — the online courses (title, provider, real URL, points)
- `targets.seed.json` — the universities and companies (with official links)

Edit any of these and **restart the API** — the changes load automatically without erasing
anyone's progress. This makes it easy to add or update content without touching code.

---

## API overview

All endpoints live under `/api` and (except sign-up/login) require you to be logged in.

```
POST /api/auth/signup · /login · /logout      GET /api/auth/me
GET  /api/journey            POST /api/journey/complete/:key
GET  /api/modules            POST /api/modules/:key/complete
GET  /api/certificates       POST /api/certificates   ·   DELETE /api/certificates/:id
GET  /api/resume             PUT  /api/resume
GET  /api/recommendations
GET  /api/profile            PUT  /api/profile
```

---

## Roadmap

ASCEND today is a working prototype. The plan to make it fully production-ready is documented
in `../CLAUDE.md` (§7) and, in short:

1. **Curated real catalog** *(core shipped)* — real course/target links, honest "unverified vs
   verified" labels, editable via the seed files.
2. **Provider ingestion** — automatically sync real course, programme, and job data on a
   schedule so recommendations reflect real requirements and demand.
3. **Verified completion** — integrate learning standards (LTI / xAPI) so a completed course
   is genuinely verified, not just self-reported.

---

## Notes

- This is an educational project. Recommendations are **guidance, not official advice** —
  always verify entry requirements, fees, and deadlines on a school's or employer's official
  site.
- Courses are hosted by their providers; ASCEND links out to them and does not host any course
  content itself.
