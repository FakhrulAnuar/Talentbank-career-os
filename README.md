# A.S.C.E.N.D.

**Advancing Skills & Career Evolution for Next-Gen Development**

ASCEND is a career-planning web app for high-school and university students. Instead of a busy
dashboard full of boxes, the whole experience is one continuous journey called the **Ascent
Path**: a route the student climbs as they build real skills and credentials.

Pick where you are (high school or university), set your interests and study year, complete
skill modules, store your certificates, keep a resume or an experience record, discover real
workshops and competitions, and get matched to real universities or companies. Everything you
do raises your **Pathway Score**, a glowing orb that climbs the path with you.

---

## What you can do

| Feature | What it does |
|---|---|
| **Ascent Path** | Your roadmap as one flowing vertical timeline. Completed steps glow, your score-orb climbs, and certificates hang along the path like lanterns. |
| **Profile** | Set a target field, interests, and your study year or school stage. This personalises your course and target matches. New sign-ups start here. Your resume (university) or experience record (high school) also lives on this page. |
| **Modules** | A catalog of real online courses (Coursera, Khan Academy, LinkedIn Learning, and more). Matched to your field and your year, so a final-year student is not pushed beginner fundamentals. Open the course on its provider, then mark it done to earn points and CV tips. |
| **Workshops & Tournaments** | Real Malaysian hackathons, competitions, workshops, and career fairs, matched to your profile. Each entry links out to the official registration page with a checked date. |
| **Certificate Vault** | Upload your credentials (PDF, PNG, or JPG). Preview images inline and download them anytime. Each certificate adds 10 points to your Pathway Score. |
| **Resume and Experience Record** | University students get an ATS-friendly resume with a live preview and PDF export. High-school students get a simpler experience record: a place to bank activities, awards, and references for the future. Both live inside the Profile page. |
| **Targets** | High-schoolers get matched to universities, university students to companies. Each target is scored against your activity with clear reasons and an official apply link. |
| **ASCEND Assistant** | An optional AI helper (see Optional AI features below) that answers questions about your own journey in English or Bahasa Melayu. |

The **Pathway Score** is simply the sum of completed milestone points, completed module points,
and ten points per certificate. It is always calculated live, so it can never be faked or drift.

---

## Tech stack

- **Frontend:** React 18 with Vite 5 (plain JavaScript and JSX, no TypeScript). One hand-written
  stylesheet with a soft aurora gradient and glassmorphism look. No UI framework and no router.
- **Backend:** Node.js with Express 4 (ES modules).
- **Database:** SQLite through Drizzle ORM (`better-sqlite3`). A single local file, with no
  database server to install.
- **Auth:** email and password with bcrypt hashing and secure server-side sessions (an httpOnly
  cookie, so no tokens are stored in the browser).
- **File uploads:** `multer`, saved to local disk behind a small storage interface.

The core app runs locally and offline. No external API keys are required to run it. The AI and
data-sync features are optional and stay switched off until you add a key.

---

## Quick start

You need Node.js 18 or newer (works on 20, 22, and 24). Check with `node --version`.

The app has two parts, an API in `server/` and a web app in `web/`, so you run two terminals.

### 1. Start the API (terminal 1)

```bash
cd server
npm install
npm run seed      # creates the database and a demo account
npm run dev       # starts the API at http://localhost:4000
```

### 2. Start the web app (terminal 2)

```bash
cd web
npm install
npm run dev       # opens the app at http://localhost:5173
```

Now open http://localhost:5173 in your browser.

### 3. Log in

- Try the demo account: `demo_hs@ascend.local` for highschool students, `demo_u@ascend.local` for university students with password `demo1234`
- Or create your own: click Create an account, choose High School or University, and you will
  start on the Profile page.

Windows note: `better-sqlite3` needs a prebuilt binary, which `npm install` fetches
automatically. The database self-migrates on start, so new columns and tables are added for you.
Only if something goes wrong should you delete `server/ascend.db` and run `npm run seed` again.

---

## Optional AI features (Google Gemini)

ASCEND has three optional AI touches, all powered by one shared, server-side Gemini client:

1. **Explain this match** on the Targets page turns the rule-based reasons into a short, warm
   explanation of why a target fits you.
2. **Course guidance** on the Modules page reorders your recommended courses and writes a short
   note tuned to your study stage.
3. **ASCEND Assistant**, a chat helper that answers questions about your own journey in English
   or Bahasa Melayu.

In every case the rules stay in charge: they decide the rankings and eligibility, and Gemini
only phrases the result. Without a key, all three simply stay hidden and the app works exactly
as before.

To turn them on, get a free key from Google AI Studio (https://aistudio.google.com/apikey),
then in `server/.env` set:

```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-flash-latest
```

New keys look like `AQ.Ab...` and are the current format; paste the key exactly, with no quotes.
Restart the API afterwards. For a real launch with student data, prefer a paid tier, because the
free tier may use inputs to improve Google's models.

There is also an optional data-sync layer (YouTube course search and Adzuna job demand) that is
off unless you provide its own keys. See `server/.env.example` for the full list.

---

## Project structure

```
Ascend-v2/
  README.md                (you are here)
  DESIGN_BLUEPRINT.md      (the visual identity and original data model)
  milestones.seed.json     (the roadmap steps)
  modules.seed.json        (the course catalog with real links and levels)
  targets.seed.json        (the universities and companies catalog)
  events.seed.json         (the workshops and tournaments catalog)

  server/                  (the API: Express, Drizzle, SQLite)
    src/
      index.js             (starts the server and sets up the database)
      db/                  (schema, connection, seed data)
      routes/              (the API endpoints: auth, journey, modules, and more)
      services/            (the business logic)
      middleware/          (the logged-in guard)

  web/                     (the web app: React and Vite)
    src/
      App.jsx              (top-level app and page switching)
      api.js               (talks to the API)
      styles.css           (all the styling, in one file)
      components/          (one file per page: Profile, Path, Modules, and more)
```

---

## Editing the content (no coding needed)

The roadmap, courses, target schools and companies, and events all live in plain JSON files at
the project root:

- `milestones.seed.json` for the steps on the path
- `modules.seed.json` for the online courses (title, provider, real URL, level, points)
- `targets.seed.json` for the universities and companies (with official links)
- `events.seed.json` for the workshops, hackathons, competitions, and career fairs

Edit any of these and restart the API. The changes load automatically without erasing anyone's
progress, so it is easy to add or update content without touching code.

---

## API overview

All endpoints live under `/api` and, except for sign-up and login, require you to be logged in.

```
POST /api/auth/signup, /login, /logout          GET /api/auth/me
GET  /api/journey             POST /api/journey/complete/:key
GET  /api/modules             POST /api/modules/:key/complete
POST /api/modules/guidance    (optional AI course ordering and note)
GET  /api/certificates        POST /api/certificates    DELETE /api/certificates/:id
GET  /api/resume              PUT  /api/resume
GET  /api/recommendations     POST /api/recommendations/:key/explain   (optional AI note)
GET  /api/events
GET  /api/profile             PUT  /api/profile
GET  /api/chat/status         POST /api/chat            (optional AI assistant)
```

---

## Roadmap

ASCEND today is a working prototype. The plan to make it fully production-ready is documented in
`../CLAUDE.md` (section 7) and, in short:

1. Curated real catalog (core shipped): real course, target, and event links, with honest
   unverified versus verified labels, editable through the seed files.
2. Provider ingestion: automatically sync real course, programme, and job data on a schedule so
   recommendations reflect real requirements and demand.
3. Verified completion: integrate learning standards (LTI or xAPI) so a completed course is
   genuinely verified, not just self-reported.

---

## Notes

- This is an educational project. Recommendations are guidance, not official advice. Always
  verify entry requirements, fees, and deadlines on a school's or employer's official site.
- Courses and events are hosted by their providers and organisers. ASCEND links out to them and
  does not host any course content or run any event itself.
