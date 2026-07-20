// Target catalog (universities + companies). Curated real entries loaded/refreshed from
// targets.seed.json into the DB (upsert by key) — edit the JSON and restart to update.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { targets } from '../db/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', '..', '..', 'targets.seed.json');

export function ensureTargets() {
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  const rows = [
    ...seed.universities.map((t) => ({ ...t, type: 'university' })),
    ...seed.companies.map((t) => ({ ...t, type: 'company' })),
  ];
  for (const t of rows) {
    const row = {
      key: t.key, type: t.type, name: t.name, field: t.field, location: t.location ?? null,
      blurb: t.blurb ?? null, tags: JSON.stringify(t.tags ?? []),
      sourceUrl: t.sourceUrl ?? null, lastVerified: t.lastVerified ?? null,
    };
    db.insert(targets).values(row).onConflictDoUpdate({
      target: targets.key,
      set: {
        type: row.type, name: row.name, field: row.field, location: row.location,
        blurb: row.blurb, tags: row.tags, sourceUrl: row.sourceUrl, lastVerified: row.lastVerified,
      },
    }).run();
  }
}

/** All targets of a type, shaped for the recommendation engine. */
export function listTargets(type) {
  return db.select().from(targets).where(eq(targets.type, type)).all().map((t) => ({
    key: t.key, name: t.name, field: t.field, location: t.location, blurb: t.blurb,
    tags: t.tags ? JSON.parse(t.tags) : [], sourceUrl: t.sourceUrl, lastVerified: t.lastVerified,
  }));
}
