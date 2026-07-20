// AI course-guidance layer for the Modules page (optional, cached, no-op without a key).
//
// The RULES already decide which courses are eligible and recommended (seniority-aware level
// gating in moduleService). Gemini's only job here is judgement WITHIN that eligible set:
// order the courses best-first for where the student is (year/stage + field), and write one
// short, stage-appropriate note ("as a final-year, prioritise advanced + interview prep" /
// "you're exploring - here's a balanced mix"). It never adds a course the rules excluded.
//
// Privacy: sends only field + interest tags + year/stage + public course metadata. Never a
// name, email, bio or precise location. Cached per (user, hash(profile+catalog)).
import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { courseGuidance } from '../db/schema.js';
import { getProfile } from './profileService.js';
import { listModules } from './moduleService.js';
import { geminiEnabled, geminiGenerate } from './geminiService.js';

const STAGE_LABEL = {
  year1: 'a first-year university student', year2: 'a second-year university student',
  year3: 'a third-year university student', final: 'a final-year university student',
  postgrad: 'a postgraduate student',
  form4: 'a Form 4 secondary-school student (still exploring)',
  form5: 'a Form 5 student in their SPM exam year',
  preu: 'a pre-university student (Form 6 / matriculation / foundation)',
};

const SYSTEM = [
  'You are a supportive study advisor for Malaysian students, some of whom are minors.',
  'You are given a shortlist of ONLINE COURSES that already passed our eligibility rules, plus the',
  'student\'s field, interests and study stage. Do TWO things and nothing else:',
  '1) order the course keys best-first for THIS student\'s stage (seniors: prioritise advanced and',
  'career-prep; juniors and school students: prioritise foundations and breadth);',
  '2) write ONE short note (1-2 sentences, under 40 words) telling them what to focus on at their stage.',
  'Never invent courses or keys that are not in the list. Never guarantee outcomes. Be encouraging.',
  'Reply with STRICT JSON only, no markdown: {"order":["key",...],"note":"..."}.',
].join(' ');

function hashInputs(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// Tolerant JSON parse: strips ```json fences and grabs the first {...} block.
function parseJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

/**
 * Return { order, note, source } for the Modules page.
 *  - order: module keys in AI-suggested order (subset of eligible), or null
 *  - note:  one short stage-appropriate line, or null
 *  - source: 'ai' | 'rules' (rules = AI off/unavailable -> client keeps its rule order)
 */
export async function getCourseGuidance(userId, pathType) {
  const profile = getProfile(userId);
  const mods = listModules(userId, pathType);

  // Candidate set = what the rules recommend (level-eligible + matched/career-prep). If nothing
  // matched, fall back to level-eligible non-essential courses so guidance still has something.
  let candidates = mods.filter((m) => m.recommended && !m.essential);
  if (candidates.length === 0) candidates = mods.filter((m) => m.levelEligible && !m.essential);
  const slim = candidates.map((m) => ({ key: m.key, title: m.title, level: m.level, tags: m.tags }));

  if (!geminiEnabled() || slim.length === 0) return { order: null, note: null, source: 'rules' };

  const payload = {
    pathType, yearLevel: profile.yearLevel, field: profile.targetField,
    interests: profile.interests, keys: slim.map((s) => s.key),
  };
  const inputHash = hashInputs(payload);

  const cached = db.select().from(courseGuidance)
    .where(and(eq(courseGuidance.userId, userId), eq(courseGuidance.inputHash, inputHash)))
    .get();
  if (cached) {
    return {
      order: cached.orderJson ? JSON.parse(cached.orderJson) : null,
      note: cached.note || null, source: 'ai', cached: true,
    };
  }

  const stage = STAGE_LABEL[profile.yearLevel] || 'a student (stage not specified)';
  const courseLines = slim.map((s) => `- ${s.key} | ${s.title} | level: ${s.level || 'n/a'} | tags: ${s.tags.join(', ')}`).join('\n');
  const prompt = [
    `Student: ${stage}.`,
    `Target field: ${profile.targetField || '(not set)'}. Interests: ${(profile.interests || []).join(', ') || '(none)'}.`,
    'Eligible courses (order these keys best-first for this student, and write the note):',
    courseLines,
  ].join('\n');

  const text = await geminiGenerate(prompt, { system: SYSTEM, maxTokens: 300 });
  const parsed = parseJson(text);
  if (!parsed) return { order: null, note: null, source: 'rules' };

  const known = new Set(slim.map((s) => s.key));
  const order = Array.isArray(parsed.order) ? parsed.order.filter((k) => known.has(k)) : null;
  const note = typeof parsed.note === 'string' ? parsed.note.trim().slice(0, 400) : null;

  db.insert(courseGuidance)
    .values({ userId, inputHash, orderJson: order ? JSON.stringify(order) : null, note, createdAt: Date.now() })
    .run();

  return { order, note, source: 'ai' };
}
