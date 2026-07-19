# A.S.C.E.N.D. — Design Blueprint (v2 clean rebuild)

*Advancing Skills & Career Evolution for Next-Gen Development*
Status: **Identity locked, schema on paper. No production code yet.**
Deployment decision: **SQLite-only for now**, behind a data-layer interface so Postgres/Fly.io/Vercel is a later config change.

---

## 1. The Core Metaphor — "The Ascent Path"

The entire app is **one continuous vertical journey**, not a dashboard. A single flowing SVG spine runs from bottom (where the student starts) to top (their goal: a target university for high schoolers, a target company for university students). Every feature lives *on* that line — nothing is a free-floating box.

| Feature | How it appears on the path (NOT a card) |
|---|---|
| Progress roadmap | The spine **is** the roadmap. Milestone nodes sit along it; completed segments glow and fill, upcoming ones are soft-dashed. |
| Pathway Score | A glowing **orb** = the student's avatar. Its *position* on the path is the score. Climbing = earning points. |
| Certificate Vault | **Lanterns** anchored to the milestone where each credential was earned. Click → glass panel slides in (bottom sheet on mobile). |
| Modules & CV tips | **Waypoints** that reveal as the orb approaches. |
| Target recommendations | The **summit marker** at the top of the path (university or company recs). |

Persistent **anchor glyphs** (a lantern cluster + a summit marker) stay pinned to the path edges at all scroll positions, so the Vault and recommendations are always discoverable even before the student reaches them.

---

## 2. Visual Identity (locked)

- **Theme:** soft-editorial + glassmorphism. *Not* dark mode.
- **Background:** aurora dawn-to-day gradient (reinforces "ascending" from dawn toward the summit).
- **Panels:** frosted translucent glass, soft shadows, generous radius. No heavy borders, no boxy grids.
- **Typography:** one humanist sans for body (Inter / General Sans) + a rounded display face for headers.
- **Motion:** smooth transitions, gentle orb pulse, segments fill as they complete. Welcoming, never overwhelming.
- **Hard rule (per project instructions):** no generic card grids, no blocky containers with heavy borders.

---

## 3. Onboarding — solving the "empty path" problem

QA's top risk was a brand-new student seeing an empty, demoralizing path. Fix:

- On signup the student picks **High School** or **University** path.
- That choice hydrates a **seeded preview path**: the first 2–3 milestones are pre-lit as "here's your journey" (visible future, not dashed void).
- The orb starts with a gentle pulse + a one-line coach prompt: *"Your first step is right here."*
- The path looks *full of promise*, never *empty of achievement*.

---

## 4. Data Model — schema on paper (SQLite now)

Pathway Score is **derived, never stored** as a mutable field — it can't drift out of sync.

```
users
  id            PK
  path_type     'highschool' | 'university'
  created_at

milestones                 -- static roadmap template
  id            PK
  order_index
  phase
  path_type     which template this belongs to

user_progress              -- one row per student per milestone
  user_id       FK  ┐ composite PK
  milestone_id  FK  ┘
  status        'preview' | 'active' | 'completed'
  points_awarded
  completed_at
  INDEX (user_id)

certificates
  id            PK
  user_id       FK
  title
  issuer
  file_ref      -- local file storage for now (interface-backed)
  milestone_id  FK  -- links the lantern to its path position

modules
  id            PK
  title
  cv_tip

user_modules               -- join
  user_id       FK
  module_id     FK
  status

recommendations
  user_id       FK
  type          'university' | 'company'
  payload
  score
```

**Pathway Score = `SUM(user_progress.points_awarded) WHERE user_id = ?`**

---

## 5. API — feeding a continuous UI without lag

One denormalized read endpoint avoids the N+1 waterfall a scrolling spine would otherwise cause:

- **`GET /api/journey`** → returns the whole path state in a single indexed JOIN, in **prioritized sections**:
  1. Path structure + score (tiny, instant — spine paints immediately)
  2. Certificates + recommendations (secondary keys, fill lanterns/summit as they land)
- Progressive render = no blank-path spinner on flaky mobile connections.
- Point awards are **committed server-side writes**, never client-held state (session-guard + no silent score rollback).
- Certificate uploads must **confirm server-side before the lantern lights** (prevents false "saved" state / data loss).

---

## 6. Production guardrails (deferred, but designed-for now)

- Data access behind an **interface / ORM** (Drizzle/Prisma) from day one → SQLite → Postgres is config, not rewrite.
- Secrets (session key, storage keys) in `.env`, validated at boot, never committed.
- Certificate files stored via a **storage interface** so they never live only in the app container → clean swap to a volume or blob store when a deploy target is chosen.
- Dockerized single container when we deploy; Fly.io + managed Postgres or Vercel + external blob are both reachable from this design.

---

## 7. Open decisions (for later)

- Final deploy target (Fly.io vs Vercel) — deferred by choice.
- Auth provider (rolled-own sessions vs a service).
- Recommendation data source (curated dataset vs external API).
```
