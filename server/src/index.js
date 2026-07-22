import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { ensureSchema } from './db/initSchema.js';
import { ensureMilestones, pruneRemovedMilestones } from './services/pathSeeder.js';
import { ensureModules } from './services/moduleService.js';
import { ensureTargets } from './services/targetService.js';
import { ensureEvents } from './services/eventService.js';
import { runIngestion } from './services/ingest/index.js';
import { authRouter } from './routes/auth.js';
import { journeyRouter } from './routes/journey.js';
import { modulesRouter } from './routes/modules.js';
import { certificatesRouter } from './routes/certificates.js';
import { resumeRouter } from './routes/resume.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { profileRouter } from './routes/profile.js';
import { ingestRouter } from './routes/ingest.js';
import { eventsRouter } from './routes/events.js';
import { chatRouter } from './routes/chat.js';
import { scholarshipsRouter } from './routes/scholarships.js';
import { ensureScholarships } from './services/scholarshipService.js';
import { internshipsRouter } from './routes/internships.js';
import { ensureInternships } from './services/internshipService.js';

// Self-initialize: create tables + load/refresh catalogs from the seed files.
ensureSchema();
ensureMilestones();
pruneRemovedMilestones(); // remove retired steps (e.g. hs_resume) from existing DBs
ensureModules();
ensureTargets();
ensureEvents();
ensureScholarships();
ensureInternships();

const app = express();
app.use(cors({ origin: true, credentials: true })); // credentials for the session cookie
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api', journeyRouter);
app.use('/api', modulesRouter);
app.use('/api', certificatesRouter);
app.use('/api', resumeRouter);
app.use('/api', recommendationsRouter);
app.use('/api', profileRouter);
app.use('/api', ingestRouter);
app.use('/api', eventsRouter);
app.use('/api', chatRouter);
app.use('/api', scholarshipsRouter);
app.use('/api', internshipsRouter);

// Optional scheduled ingestion (step 2). Off unless INGEST_INTERVAL_MIN > 0.
if (config.ingestIntervalMin > 0) {
  const ms = config.ingestIntervalMin * 60 * 1000;
  console.log(`[ingest] scheduled every ${config.ingestIntervalMin} min`);
  setInterval(() => { runIngestion().catch((e) => console.warn('[ingest] scheduled run failed', e.message)); }, ms);
}

app.listen(config.port, () => {
  console.log(`ASCEND API on http://localhost:${config.port}`);
});
