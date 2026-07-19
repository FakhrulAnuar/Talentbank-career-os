// Dev seed: builds tables, loads the milestone template, and creates a demo account
// (demo@ascend.local / demo1234) with some completed steps so you can log in and see a
// populated Ascent Path immediately. Real users are created via /api/auth/signup.
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { sqlite, db } from './client.js';
import { ensureSchema } from './initSchema.js';
import { ensureMilestones, seedUserPath } from '../services/pathSeeder.js';
import { users, userProgress, milestones, certificates, recommendations } from './schema.js';

ensureSchema();

// fresh demo data each run (templates are re-created by ensureMilestones)
sqlite.exec(`DELETE FROM recommendations; DELETE FROM certificates; DELETE FROM user_progress; DELETE FROM sessions; DELETE FROM users; DELETE FROM milestones;`);
ensureMilestones();

const now = Date.now();
const demo = db.insert(users).values({
  displayName: 'Demo Student',
  email: 'demo@ascend.local',
  passwordHash: bcrypt.hashSync('demo1234', 10),
  pathType: 'highschool',
  createdAt: now,
}).returning().get();

// seed a fresh path, then advance the demo through the first four steps to show progress
seedUserPath(demo.id, 'highschool');
const hs = db.select().from(milestones).all()
  .filter((m) => m.pathType === 'highschool')
  .sort((a, b) => a.orderIndex - b.orderIndex);

for (const m of hs) {
  if (m.orderIndex <= 4) {
    db.update(userProgress)
      .set({ status: 'completed', pointsAwarded: m.points, completedAt: now })
      .where(and(eq(userProgress.userId, demo.id), eq(userProgress.milestoneId, m.id)))
      .run();
  } else if (m.orderIndex === 5) {
    db.update(userProgress)
      .set({ status: 'active' })
      .where(and(eq(userProgress.userId, demo.id), eq(userProgress.milestoneId, m.id)))
      .run();
  }
}

const certMilestone = hs.find((m) => m.key === 'hs_first_cert');
db.insert(certificates).values([
  { userId: demo.id, milestoneId: certMilestone?.id ?? null, title: 'Data Literacy', issuer: 'ASCEND Academy', fileRef: 'demo://data-literacy', issuedAt: now },
  { userId: demo.id, milestoneId: certMilestone?.id ?? null, title: 'Digital Ethics (short course)', issuer: 'Partner org', fileRef: 'demo://ethics', issuedAt: now },
]).run();

db.insert(recommendations).values([
  { userId: demo.id, type: 'university', label: 'UM · Computer Science', score: 92 },
  { userId: demo.id, type: 'university', label: 'USM · Data Science', score: 88 },
]).run();

console.log(`Seeded milestones + demo account (demo@ascend.local / demo1234), user #${demo.id}.`);
