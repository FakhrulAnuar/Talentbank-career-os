// AI "why this fits you" explanation layer for target recommendations.
//
// The RULES decide everything that matters: which targets appear, their rank, and the reason
// chips. Gemini's only job is to turn those rule-derived reasons into one warm, plain-language
// paragraph for the student. If Gemini is off or fails, callers fall back to the reason chips.
//
// Privacy: the prompt carries only anonymized signals - the target's public info, the user's
// stated field + interest tags, and the rule-generated reasons. Never a name, email, bio or
// precise location. Results are cached per (user, target, input-hash) so we call the API once.
import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { recExplanations } from '../db/schema.js';
import { matchForTarget } from './recommendationService.js';
import { geminiEnabled, geminiGenerate } from './geminiService.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const SYSTEM = [
  'You are a supportive career-guidance assistant for Malaysian students, some of whom are minors.',
  'Explain, in 2 to 3 short sentences, why a matched university or company could be a good fit for the student,',
  'based ONLY on the reasons provided. Then suggest ONE concrete next step to strengthen their fit.',
  'Rules: be warm and encouraging but honest. Never guarantee admission, a job, a scholarship or any outcome.',
  'Do not invent facts about the institution or the student. Do not give financial, legal or medical advice.',
  'Plain language, no jargon, no markdown, no emojis. Keep it under 70 words.',
].join(' ');

// Stable hash of the exact signals we send, so a cache entry is reused only when nothing
// relevant changed (new interest, new module, new cert -> new hash -> fresh explanation).
function hashInputs(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildPrompt(target, signals, reasons) {
  const interests = (signals.interests || []).join(', ') || '(none set)';
  const field = signals.targetField || '(not set)';
  const reasonList = reasons.map((r) => `- ${r}`).join('\n');
  return [
    `Target: ${target.name} (field: ${target.field}${target.location ? `, ${target.location}` : ''}).`,
    target.blurb ? `About the target: ${target.blurb}` : '',
    `Student's stated target field: ${field}.`,
    `Student's interests: ${interests}.`,
    `Our matching rules flagged these reasons:\n${reasonList}`,
    'Write the explanation for the student now.',
  ].filter(Boolean).join('\n');
}

/**
 * Return an AI explanation for one target match. Shape:
 *   { text, source: 'ai'|'rules', cached?, reasons }
 * source==='rules' (text null) means AI is off or unavailable -> client shows the reason chips.
 */
export async function explainMatch(userId, pathType, key) {
  const match = matchForTarget(userId, pathType, key);
  if (!match) throw httpError(404, 'That target is not on your path.');

  const { target, signals, reasons } = match;
  if (!geminiEnabled()) return { text: null, source: 'rules', reasons };

  const payload = { key, field: signals.targetField, interests: signals.interests, reasons };
  const inputHash = hashInputs(payload);

  const cached = db.select().from(recExplanations)
    .where(and(
      eq(recExplanations.userId, userId),
      eq(recExplanations.targetKey, key),
      eq(recExplanations.inputHash, inputHash),
    )).get();
  if (cached) return { text: cached.text, source: 'ai', cached: true, reasons };

  const text = await geminiGenerate(buildPrompt(target, signals, reasons), { system: SYSTEM });
  if (!text) return { text: null, source: 'rules', reasons };

  db.insert(recExplanations)
    .values({ userId, targetKey: key, inputHash, text, createdAt: Date.now() })
    .run();

  return { text, source: 'ai', reasons };
}
