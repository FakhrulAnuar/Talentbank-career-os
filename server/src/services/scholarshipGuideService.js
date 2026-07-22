// AI "how to apply" guide for a scholarship (optional, cached, no-op without a key).
//
// Given a scholarship's public details plus the student's stage and field, Gemini writes a few
// short, practical steps on how to approach the application and strengthen it against the stated
// requirements. It NEVER guarantees the student will get it, and always points them to the
// official site for exact criteria and deadlines. Minor-safe. Cached per (user, scholarship,
// input-hash) so the API is called once per unique signal-set.
import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { scholarshipGuides } from '../db/schema.js';
import { getProfile } from './profileService.js';
import { getScholarship } from './scholarshipService.js';
import { geminiEnabled, geminiGenerate } from './geminiService.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const SYSTEM = [
  'You are a supportive scholarship advisor for Malaysian students, some of whom are minors.',
  'Given a scholarship and the student\'s stage and field, explain in 3 to 5 short, practical steps',
  'how to approach applying and how to strengthen the application against the stated requirements.',
  'Rules: be encouraging but honest. NEVER guarantee they will get the scholarship or an interview.',
  'Do not invent requirements, amounts or deadlines beyond what is given; tell them to confirm exact',
  'criteria and deadlines on the official site. No financial, legal or medical advice. Keep it under',
  '110 words, plain language, no markdown, no emojis.',
].join(' ');

function hashInputs(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildPrompt(sch, profile) {
  const reqs = (sch.requirements || []).map((r) => `- ${r}`).join('\n');
  return [
    `Scholarship: ${sch.name} (${sch.provider || 'provider'}).`,
    `Type: ${sch.type || 'n/a'}, award: ${sch.award || 'n/a'}, stage: ${sch.stage || 'n/a'}, field: ${sch.field || 'n/a'}.`,
    sch.benefit ? `Benefit: ${sch.benefit}` : '',
    sch.deadline ? `Deadline note: ${sch.deadline}` : '',
    `Requirements (summary):\n${reqs || '- (not listed)'}`,
    `Student stage: ${profile.yearLevel || 'not set'}. Student field of interest: ${profile.targetField || 'not set'}.`,
    'Write the how-to-apply steps for this student now.',
  ].filter(Boolean).join('\n');
}

/**
 * Return { text, source } for the "how to apply" guide. source==='rules' (text null) means the
 * AI layer is off or unavailable, and the client shows the plain requirements instead.
 */
export async function getApplyGuide(userId, key) {
  const sch = getScholarship(key);
  if (!sch) throw httpError(404, 'Scholarship not found.');
  if (!geminiEnabled()) return { text: null, source: 'rules' };

  const profile = getProfile(userId);
  const payload = { key, stage: profile.yearLevel, field: profile.targetField };
  const inputHash = hashInputs(payload);

  const cached = db.select().from(scholarshipGuides)
    .where(and(
      eq(scholarshipGuides.userId, userId),
      eq(scholarshipGuides.scholarshipKey, key),
      eq(scholarshipGuides.inputHash, inputHash),
    )).get();
  if (cached) return { text: cached.text, source: 'ai', cached: true };

  const text = await geminiGenerate(buildPrompt(sch, profile), { system: SYSTEM, maxTokens: 400 });
  if (!text) return { text: null, source: 'rules' };

  db.insert(scholarshipGuides)
    .values({ userId, scholarshipKey: key, inputHash, text, createdAt: Date.now() })
    .run();

  return { text, source: 'ai' };
}
