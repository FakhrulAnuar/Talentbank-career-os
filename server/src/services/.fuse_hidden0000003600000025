// Reusable path seeding. The milestone template (milestones.seed.json) is the source of
// truth; a new signup hydrates it into user_progress so their Ascent Path is never empty.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { milestones, userProgress } from '../db/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', '..', '..', 'milestones.seed.json');

/** Load the milestone template into the milestones table if it's empty (idempotent). */
export function ensureMilestones() {
  const existing = db.select({ id: milestones.id }).from(milestones).get();
  if (existing) return;

  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  const rows = [];
  for (const pathType of ['highschool', 'university']) {
    for (const m of seed[pathType]) {
      rows.push({
        key: m.key, pathType, orderIndex: m.order_index,
        phase: m.phase, title: m.title, kind: m.kind, points: m.points,
      });
    }
  }
  db.insert(milestones).values(rows).run();
}

/**
 * Seed a fresh user's progress for their chosen path: the first step is 'active',
 * everything else is 'preview' (visible, not empty). Score starts at 0.
 */
export function seedUserPath(userId, pathType) {
  const rows = db.select().from(milestones)
    .where(eq(milestones.pathType, pathType))
    .orderBy(asc(milestones.orderIndex)).all();

  const progress = rows.map((m) => ({
    userId,
    milestoneId: m.id,
    status: m.orderIndex === 1 ? 'active' : 'preview',
    pointsAwarded: 0,
    completedAt: null,
  }));
  if (progress.length) db.insert(userProgress).values(progress).run();
}
