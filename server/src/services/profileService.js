// Profile & interests. Stored per user; the target field + interests become extra signals
// for the recommendation engine and can prefill the resume.
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { profiles } from '../db/schema.js';

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const arr = (a, max = 20, itemMax = 60) =>
  Array.isArray(a) ? [...new Set(a.map((s) => str(s, itemMax)).filter(Boolean))].slice(0, max) : [];

// Year/stage the student is at. University years + high-school stages. '' = not set.
const YEAR_LEVELS = new Set(['year1', 'year2', 'year3', 'final', 'postgrad', 'form4', 'form5', 'preu']);
const yearLevel = (v) => (YEAR_LEVELS.has(v) ? v : '');

export function getProfile(userId) {
  const row = db.select().from(profiles).where(eq(profiles.userId, userId)).get();
  if (!row) return { targetField: '', interests: [], bio: '', location: '', yearLevel: '' };
  return {
    targetField: row.targetField || '',
    interests: row.interests ? JSON.parse(row.interests) : [],
    bio: row.bio || '',
    location: row.location || '',
    yearLevel: row.yearLevel || '',
  };
}

export function saveProfile(userId, data) {
  const clean = {
    targetField: str(data?.targetField, 120),
    interests: arr(data?.interests),
    bio: str(data?.bio, 1000),
    location: str(data?.location, 120),
    yearLevel: yearLevel(data?.yearLevel),
  };
  const now = Date.now();
  db.insert(profiles)
    .values({ userId, targetField: clean.targetField, interests: JSON.stringify(clean.interests), bio: clean.bio, location: clean.location, yearLevel: clean.yearLevel, updatedAt: now })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { targetField: clean.targetField, interests: JSON.stringify(clean.interests), bio: clean.bio, location: clean.location, yearLevel: clean.yearLevel, updatedAt: now },
    })
    .run();
  return clean;
}
