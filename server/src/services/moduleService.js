// Online modules: catalog loading, per-user listing, and completion.
// Completed module points feed the derived Pathway Score (see journeyRepo).
// Each module links to a REAL external course; completion is honor-system until verified.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq, and, or, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { modules, userModules } from '../db/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', '..', '..', 'modules.seed.json');

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/**
 * Load/refresh the module catalog from the seed file (upsert by key). Editing
 * modules.seed.json and restarting updates the catalog without wiping user completions.
 */
export function ensureModules() {
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  for (const m of seed.modules) {
    const row = {
      key: m.key, pathType: m.pathType, title: m.title, phase: m.phase,
      description: m.description, cvTip: m.cvTip ?? null, minutes: m.minutes ?? 0,
      points: m.points ?? 0, provider: m.provider ?? null, url: m.url ?? null,
      verified: m.verified ? 1 : 0, lastVerified: m.lastVerified ?? null,
    };
    db.insert(modules).values(row).onConflictDoUpdate({
      target: modules.key,
      set: {
        pathType: row.pathType, title: row.title, phase: row.phase, description: row.description,
        cvTip: row.cvTip, minutes: row.minutes, points: row.points, provider: row.provider,
        url: row.url, verified: row.verified, lastVerified: row.lastVerified,
      },
    }).run();
  }
}

/** Modules visible to this path (its own + 'both'), with the user's status + real links. */
export function listModules(userId, pathType) {
  const rows = db
    .select({
      key: modules.key, title: modules.title, phase: modules.phase,
      description: modules.description, cvTip: modules.cvTip,
      minutes: modules.minutes, points: modules.points,
      provider: modules.provider, url: modules.url,
      verified: modules.verified, lastVerified: modules.lastVerified,
      status: userModules.status,
    })
    .from(modules)
    .leftJoin(userModules, and(eq(userModules.moduleId, modules.id), eq(userModules.userId, userId)))
    .where(or(eq(modules.pathType, pathType), eq(modules.pathType, 'both')))
    .orderBy(asc(modules.phase), asc(modules.points))
    .all();
  return rows.map((r) => ({ ...r, verified: Boolean(r.verified), status: r.status ?? 'not_started' }));
}

/** Mark a module completed (idempotent, honor-system). Returns the points awarded. */
export function completeModule(userId, pathType, key) {
  const mod = db.select().from(modules).where(eq(modules.key, key)).get();
  if (!mod) throw httpError(404, 'Module not found.');
  if (mod.pathType !== 'both' && mod.pathType !== pathType) {
    throw httpError(403, 'That module is not on your path.');
  }
  const now = Date.now();
  db.insert(userModules)
    .values({ userId, moduleId: mod.id, status: 'completed', completedAt: now })
    .onConflictDoUpdate({
      target: [userModules.userId, userModules.moduleId],
      set: { status: 'completed', completedAt: now },
    })
    .run();
  return { moduleKey: key, pointsAwarded: mod.points };
}

/** Sum of points from the user's completed modules (added to the Pathway Score). */
export function completedModulePoints(userId) {
  const rows = db
    .select({ points: modules.points })
    .from(userModules)
    .innerJoin(modules, eq(userModules.moduleId, modules.id))
    .where(and(eq(userModules.userId, userId), eq(userModules.status, 'completed')))
    .all();
  return rows.reduce((s, r) => s + r.points, 0);
}
