// Internship catalog (curated real Malaysian internship programmes). University-facing counterpart
// to scholarships: loaded/refreshed from internships.seed.json into the DB (upsert by key).
// Listing is PROFILE-AWARE (field/interest tags -> 'recommended') and STATE-AWARE (same-state
// internships flagged 'nearYou' since location matters for on-site placements). Broadly-open
// government schemes (alwaysShow) are 'openToAll'. We show a requirements summary, never claim a
// student qualifies.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { internships } from '../db/schema.js';
import { getProfile } from './profileService.js';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', '..', '..', 'internships.seed.json');

const words = (s) => (s || '').toLowerCase().match(/[a-z]+/g)?.filter((w) => w.length >= 3) || [];

/** Load/refresh the internship catalog from the seed file (upsert by key). */
export function ensureInternships() {
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  for (const it of seed.internships) {
    const row = {
      key: it.key, company: it.company, role: it.role ?? null, field: it.field ?? null,
      location: it.location ?? null, state: it.state ?? null, mode: it.mode ?? null,
      duration: it.duration ?? null, paid: it.paid ?? null, blurb: it.blurb ?? null,
      requirements: JSON.stringify(it.requirements ?? []), deadline: it.deadline ?? null,
      url: it.url ?? null, tags: JSON.stringify(it.tags ?? []),
      alwaysShow: it.alwaysShow ? 1 : 0, lastVerified: it.lastVerified ?? null,
    };
    db.insert(internships).values(row).onConflictDoUpdate({
      target: internships.key,
      set: {
        company: row.company, role: row.role, field: row.field, location: row.location,
        state: row.state, mode: row.mode, duration: row.duration, paid: row.paid,
        blurb: row.blurb, requirements: row.requirements, deadline: row.deadline, url: row.url,
        tags: row.tags, alwaysShow: row.alwaysShow, lastVerified: row.lastVerified,
      },
    }).run();
  }
}

function matchScore(tags, signalWords) {
  let score = 0;
  for (const tag of tags) {
    const tagWords = tag.split(' ');
    if (tagWords.some((tw) => signalWords.has(tw)) || [...signalWords].some((sw) => tag.includes(sw))) score++;
  }
  return score;
}

/** All internships, each flagged recommended / nearYou / openToAll for the UI groups. */
export function listInternships(userId) {
  const profile = getProfile(userId);
  const signalWords = new Set([...words(profile.targetField), ...(profile.interests || []).flatMap((i) => words(i))]);

  return db.select().from(internships).all().map((r) => {
    const tags = r.tags ? JSON.parse(r.tags) : [];
    const score = matchScore(tags, signalWords);
    const nearYou = r.state && profile.state && r.state === profile.state;
    return {
      key: r.key, company: r.company, role: r.role, field: r.field,
      location: r.location, state: r.state, mode: r.mode, duration: r.duration, paid: r.paid,
      blurb: r.blurb, requirements: r.requirements ? JSON.parse(r.requirements) : [],
      deadline: r.deadline, url: r.url, tags, lastVerified: r.lastVerified,
      openToAll: Boolean(r.alwaysShow),
      nearYou: Boolean(nearYou),
      recommended: score > 0,
      matchScore: score,
    };
  });
}

/** One internship by key (for the AI "how to apply" guide). */
export function getInternship(key) {
  const r = db.select().from(internships).where(eq(internships.key, key)).get();
  return r ? { ...r, requirements: r.requirements ? JSON.parse(r.requirements) : [], tags: r.tags ? JSON.parse(r.tags) : [] } : null;
}
