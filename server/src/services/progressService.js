// Progress writes for the Ascent Path. Kept in one transaction so a completion and the
// advance of the next step commit together - no partial state, no score drift.
import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { milestones, userProgress } from '../db/schema.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Milestone kinds that can't be completed by the generic "Complete this step" button -
// they require finishing a real action on their own page (e.g. saving the Profile).
const GATED_KINDS = new Set(['onboarding']);

/**
 * Complete the user's currently-active milestone (identified by key) and light the next
 * previewed step. Only an 'active' milestone can be completed. Gated milestones (e.g. the
 * profile step) can only be completed via their own action page - pass opts.viaAction:true
 * from that page's route. Returns nothing; the caller re-reads the journey for fresh state.
 */
export function completeActiveMilestone(userId, pathType, key, opts = {}) {
  const milestone = db.select().from(milestones)
    .where(and(eq(milestones.key, key), eq(milestones.pathType, pathType)))
    .get();
  if (!milestone) throw httpError(404, 'Milestone not found on your path.');

  const current = db.select().from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.milestoneId, milestone.id)))
    .get();
  if (!current) throw httpError(404, 'No progress for that milestone.');
  if (current.status === 'completed') throw httpError(409, 'That step is already complete.');
  if (current.status !== 'active') throw httpError(409, 'You can only complete your current step.');
  if (GATED_KINDS.has(milestone.kind) && !opts.viaAction) {
    throw httpError(409, 'Complete this step from its own page.');
  }

  // ordered path with each step's status, to find the next previewed step to activate
  const path = db
    .select({
      milestoneId: milestones.id,
      orderIndex: milestones.orderIndex,
      status: userProgress.status,
    })
    .from(milestones)
    .innerJoin(userProgress, and(
      eq(userProgress.milestoneId, milestones.id),
      eq(userProgress.userId, userId),
    ))
    .where(eq(milestones.pathType, pathType))
    .orderBy(asc(milestones.orderIndex))
    .all();

  const next = path.find((m) => m.orderIndex > milestone.orderIndex && m.status === 'preview');
  const now = Date.now();

  db.transaction((tx) => {
    tx.update(userProgress)
      .set({ status: 'completed', pointsAwarded: milestone.points, completedAt: now })
      .where(and(eq(userProgress.userId, userId), eq(userProgress.milestoneId, milestone.id)))
      .run();

    if (next) {
      tx.update(userProgress)
        .set({ status: 'active' })
        .where(and(eq(userProgress.userId, userId), eq(userProgress.milestoneId, next.milestoneId)))
        .run();
    }
  });

  return { completedKey: key, pointsAwarded: milestone.points, advanced: Boolean(next) };
}
