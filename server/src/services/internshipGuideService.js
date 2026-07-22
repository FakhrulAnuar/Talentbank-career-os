// AI "how to apply / prep" guide for an internship (optional, cached, no-op without a key).
// Mirrors scholarshipGuideService: given the internship's public details plus the student's
// stage and field, Gemini writes a few practical steps to apply and stand out. Never guarantees
// getting the internship; points to the official site. Minor-safe. Cached per (user, internship,
// input-hash).
import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { internshipGuides } from '../db/schema.js';
import { getProfile } from './profileService.js';
import { getInternship } from './internshipService.js';
import { geminiEnabled, geminiGenerate } from './geminiService.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const SYSTEM = [
  'You are a supportive careers advisor for Malaysian university students.',
  'Given an internship and the student\'s stage and field, explain in 3 to 5 short, practical steps',
  'how to apply and how to stand out (CV, portfolio, relevant projects, interview prep).',
  'Rules: be encouraging but honest. NEVER guarantee an internship or an interview. Do not invent',
  'requirements, stipends or deadlines beyond what is given; tell them to confirm on the official',
  'site. No financial, legal or medical advice. Keep it under 110 words, plain language, no markdown.',
].join(' ');

function hashInputs(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildPrompt(it, profile) {
  const reqs = (it.requirements || []).map((r) => `- ${r}`).join('\n');
  return [
    `Internship: ${it.role || 'Internship'} at ${it.company}.`,
    `Field: ${it.field || 'n/a'}, location: ${it.location || 'n/a'}, mode: ${it.mode || 'n/a'}, duration: ${it.duration || 'n/a'}, pay: ${it.paid || 'n/a'}.`,
    it.blurb ? `About: ${it.blurb}` : '',
    it.deadline ? `Deadline note: ${it.deadline}` : '',
    `Requirements (summary):\n${reqs || '- (not listed)'}`,
    `Student stage: ${profile.yearLevel || 'not set'}. Student field of interest: ${profile.targetField || 'not set'}.`,
    'Write the how-to-apply steps for this student now.',
  ].filter(Boolean).join('\n');
}

/** Return { text, source } for the "how to apply" guide (source 'rules' with null text = AI off). */
export async function getInternshipGuide(userId, key) {
  const it = getInternship(key);
  if (!it) throw httpError(404, 'Internship not found.');
  if (!geminiEnabled()) return { text: null, source: 'rules' };

  const profile = getProfile(userId);
  const payload = { key, stage: profile.yearLevel, field: profile.targetField };
  const inputHash = hashInputs(payload);

  const cached = db.select().from(internshipGuides)
    .where(and(
      eq(internshipGuides.userId, userId),
      eq(internshipGuides.internshipKey, key),
      eq(internshipGuides.inputHash, inputHash),
    )).get();
  if (cached) return { text: cached.text, source: 'ai', cached: true };

  const text = await geminiGenerate(buildPrompt(it, profile), { system: SYSTEM, maxTokens: 400 });
  if (!text) return { text: null, source: 'rules' };

  db.insert(internshipGuides)
    .values({ userId, internshipKey: key, inputHash, text, createdAt: Date.now() })
    .run();

  return { text, source: 'ai' };
}
