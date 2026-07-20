// Workshops / tournaments / competitions / career-fairs catalog. Curated real entries are
// loaded/refreshed from events.seed.json into the DB (upsert by key) - edit the JSON and
// restart to update. Listing is PROFILE-AWARE like modules: events whose tags match the
// user's target field/interests are flagged 'recommended'; broadly-useful events (alwaysShow)
// are flagged 'featured' for everyone. We never host an event - each links to its official page.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq, or, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { events } from '../db/schema.js';
import { getProfile } from './profileService.js';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', '..', '..', 'events.seed.json');

const words = (s) => (s || '').toLowerCase().match(/[a-z]+/g)?.filter((w) => w.length >= 3) || [];

/** Load/refresh the events catalog from the seed file (upsert by key). */
export function ensureEvents() {
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  for (const e of seed.events) {
    const row = {
      key: e.key, pathType: e.pathType || 'both', type: e.type, title: e.title,
      organizer: e.organizer ?? null, date: e.date ?? null, deadline: e.deadline ?? null,
      location: e.location ?? null, mode: e.mode ?? null, cost: e.cost ?? null,
      blurb: e.blurb ?? null, url: e.url ?? null, tags: JSON.stringify(e.tags ?? []),
      alwaysShow: e.alwaysShow ? 1 : 0, lastVerified: e.lastVerified ?? null,
    };
    db.insert(events).values(row).onConflictDoUpdate({
      target: events.key,
      set: {
        pathType: row.pathType, type: row.type, title: row.title, organizer: row.organizer,
        date: row.date, deadline: row.deadline, location: row.location, mode: row.mode,
        cost: row.cost, blurb: row.blurb, url: row.url, tags: row.tags,
        alwaysShow: row.alwaysShow, lastVerified: row.lastVerified,
      },
    }).run();
  }
}

// How well an event's tags match the user's profile (target field + interests).
function matchScore(tags, signalWords) {
  let score = 0;
  for (const tag of tags) {
    const tagWords = tag.split(' ');
    if (tagWords.some((tw) => signalWords.has(tw)) || [...signalWords].some((sw) => tag.includes(sw))) score++;
  }
  return score;
}

/** Events visible to this path, each flagged featured/recommended for the UI groups. */
export function listEvents(userId, pathType) {
  const profile = getProfile(userId);
  const signalWords = new Set([...words(profile.targetField), ...(profile.interests || []).flatMap((i) => words(i))]);

  const rows = db.select().from(events)
    .where(or(eq(events.pathType, pathType), eq(events.pathType, 'both')))
    .orderBy(asc(events.type), asc(events.title))
    .all();

  return rows.map((r) => {
    const tags = r.tags ? JSON.parse(r.tags) : [];
    const score = matchScore(tags, signalWords);
    return {
      key: r.key, type: r.type, title: r.title, organizer: r.organizer,
      date: r.date, deadline: r.deadline, location: r.location, mode: r.mode,
      cost: r.cost, blurb: r.blurb, url: r.url, tags,
      lastVerified: r.lastVerified,
      featured: Boolean(r.alwaysShow),
      recommended: score > 0,
      matchScore: score,
    };
  });
}
