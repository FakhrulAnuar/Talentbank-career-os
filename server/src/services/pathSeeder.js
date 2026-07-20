// Reusable path seeding. The milestone template (milestones.seed.json) is the source of
// truth; a new signup hydrates it into user_progress so their Ascent Path is never empty.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { milestones, userProgress } from '../db/schema.js';

// Milestone keys retired from the product. Pruned from existing DBs on boot (the seed no
// longer contains them, but ensureMilestones only seeds an empty table, so live databases
// need this cleanup). Currently: hs_resume - high-schoolers don't need a resume.
const REMOVED_KEYS = ['hs_resume'];

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
 * Idempotently remove retired milestones (REMOVED_KEYS) and their per-user progress. If a
 * removed milestone was a user's ACTIVE step, advance them to their next previewed step so
 * nobody gets stranded. Safe to run on every boot; a no-op once the rows are gone. The derived
 * Pathway Score recomputes automatically (a removed completed step simply stops contributing).
 */
export function pruneRemovedMilestones() {
  for (const key of REMOVED_KEYS) {
    const m = db.select().from(milestones).where(eq(milestones.key, key)).get();
    if (!m) continue;

    // Users for whom this milestone is currently active - advance them first.
    const activeRows = db.select({ userId: userProgress.userId })
      .from(userProgress)
      .where(and(eq(userProgress.milestoneId, m.id), eq(userProgress.status, 'active')))
      .all();

    for (const { userId } of activeRows) {
      const path = db
        .select({ mid: milestones.id, oi: milestones.orderIndex, status: userProgress.status })
        .from(milestones)
        .innerJoin(userProgress, and(
          eq(userProgress.milestoneId, milestones.id),
          eq(userProgress.userId, userId),
        ))
        .where(eq(milestones.pathType, m.pathType))
        .orderBy(asc(milestones.orderIndex))
        .all();
      const next = path.find((p) => p.oi > m.orderIndex && p.status === 'preview');
      if (next) {
        db.update(userProgress).set({ status: 'active' })
          .where(and(eq(userProgress.userId, userId), eq(userProgress.milestoneId, next.mid)))
          .run();
      }
    }

    // Remove progress rows first (FK-safe), then the milestone template row itself.
    db.delete(userProgress).where(eq(userProgress.milestoneId, m.id)).run();
    db.delete(milestones).where(eq(milestones.id, m.id)).run();
  }
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
