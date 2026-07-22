// Scholarship catalog (curated real Malaysian scholarships). Loaded/refreshed from
// scholarships.seed.json into the DB (upsert by key) - edit the JSON and restart to update.
// Listing is PROFILE-AWARE and STATE-AWARE: scholarships whose field/stage tags match the
// student's profile are flagged 'recommended'; state-foundation scholarships from the student's
// own state are flagged 'fromYourState'; broadly-open ones (alwaysShow) are 'openToAll'. We
// NEVER decide whether a student qualifies - requirements are shown as a summary only.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { scholarships } from '../db/schema.js';
import { getProfile } from './profileService.js';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', '..', '..', 'scholarships.seed.json');

const words = (s) => (s || '').toLowerCase().match(/[a-z]+/g)?.filter((w) => w.length >= 3) || [];

/** Load/refresh the scholarship catalog from the seed file (upsert by key). */
export function ensureScholarships() {
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  for (const s of seed.scholarships) {
    const row = {
      key: s.key, name: s.name, provider: s.provider ?? null, type: s.type ?? null,
      award: s.award ?? null, stage: s.stage ?? null, field: s.field ?? null,
      benefit: s.benefit ?? null, requirements: JSON.stringify(s.requirements ?? []),
      deadline: s.deadline ?? null, scope: s.scope ?? 'national', state: s.state ?? null,
      url: s.url ?? null, tags: JSON.stringify(s.tags ?? []),
      alwaysShow: s.alwaysShow ? 1 : 0, lastVerified: s.lastVerified ?? null,
    };
    db.insert(scholarships).values(row).onConflictDoUpdate({
      target: scholarships.key,
      set: {
        name: row.name, provider: row.provider, type: row.type, award: row.award,
        stage: row.stage, field: row.field, benefit: row.benefit, requirements: row.requirements,
        deadline: row.deadline, scope: row.scope, state: row.state, url: row.url,
        tags: row.tags, alwaysShow: row.alwaysShow, lastVerified: row.lastVerified,
      },
    }).run();
  }
}

// How well a scholarship's tags match the student's profile (target field + interests).
function matchScore(tags, signalWords) {
  let score = 0;
  for (const tag of tags) {
    const tagWords = tag.split(' ');
    if (tagWords.some((tw) => signalWords.has(tw)) || [...signalWords].some((sw) => tag.includes(sw))) score++;
  }
  return score;
}

/** All scholarships, each flagged recommended / fromYourState / openToAll for the UI groups. */
export function listScholarships(userId) {
  const profile = getProfile(userId);
  const signalWords = new Set([...words(profile.targetField), ...(profile.interests || []).flatMap((i) => words(i))]);

  return db.select().from(scholarships).all().map((r) => {
    const tags = r.tags ? JSON.parse(r.tags) : [];
    const score = matchScore(tags, signalWords);
    const fromYourState = r.scope === 'state' && r.state && profile.state && r.state === profile.state;
    return {
      key: r.key, name: r.name, provider: r.provider, type: r.type, award: r.award,
      stage: r.stage, field: r.field, benefit: r.benefit,
      requirements: r.requirements ? JSON.parse(r.requirements) : [],
      deadline: r.deadline, scope: r.scope, state: r.state, url: r.url, tags,
      lastVerified: r.lastVerified,
      openToAll: Boolean(r.alwaysShow),
      fromYourState: Boolean(fromYourState),
      recommended: score > 0,
      matchScore: score,
    };
  });
}

/** One scholarship by key (for the AI "how to apply" guide). */
export function getScholarship(key) {
  const r = db.select().from(scholarships).where(eq(scholarships.key, key)).get();
  return r ? { ...r, requirements: r.requirements ? JSON.parse(r.requirements) : [], tags: r.tags ? JSON.parse(r.tags) : [] } : null;
}
