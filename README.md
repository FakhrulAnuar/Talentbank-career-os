# A.S.C.E.N.D. v2

Continuous career-planner ("the Ascent Path") for high-school and university students.

## Structure

```
Ascend-v2/
├─ DESIGN_BLUEPRINT.md      # locked identity + data model
├─ milestones.seed.json     # roadmap template (source of truth)
├─ mockup-ascent-path.html  # static design mockup
├─ server/                  # Express + Drizzle + SQLite API
└─ web/                     # React + Vite frontend
```

## Run (skeleton)

```bash
# 1. API
cd server
npm install
npm run seed        # creates ascend.db and loads milestones
npm run dev         # http://localhost:4000/api/journey

# 2. Frontend (new terminal)
cd web
npm install
npm run dev         # http://localhost:5173
```

This is the **skeleton only**: DB + seed + a stubbed `GET /api/journey` that returns a
seeded demo path, and the Ascent Path UI wired to it. No auth, no feature logic yet.
