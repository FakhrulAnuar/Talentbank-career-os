// Grounded ASCEND assistant. Answers questions about the signed-in student's own journey and
// about using the app, in English or Bahasa Melayu. It is scoped to ASCEND + study/career
// guidance and is minor-safe by design. Reuses the shared geminiService (no-op without a key).
//
// Grounding: we assemble a small "context pack" from the user's OWN data (never another user's)
// and pass it as the system instruction, so replies are specific to where they are. History is
// stateless - the client sends the recent turns each request. A per-user in-memory rate limit
// keeps cost and abuse in check.
import { getProfile } from './profileService.js';
import { journeyRepo } from '../data/journeyRepo.js';
import { listModules } from './moduleService.js';
import { getRecommendations } from './recommendationService.js';
import { listEvents } from './eventService.js';
import { geminiEnabled, geminiChat } from './geminiService.js';

export function chatEnabled() {
  return geminiEnabled();
}

// --- per-user rate limit (in-memory; resets on restart, fine for a single process) ----------
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_IN_WINDOW = 20;
const hits = new Map();

export function isRateLimited(userId) {
  const now = Date.now();
  const arr = (hits.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_IN_WINDOW) { hits.set(userId, arr); return true; }
  arr.push(now);
  hits.set(userId, arr);
  return false;
}

const SYSTEM_BASE = [
  'You are ASCEND Assistant, a warm, supportive guide for Malaysian students (high school and',
  'university) using the ASCEND career-planning app. Some users are minors, so keep everything',
  'age-appropriate, encouraging and safe.',
  '',
  'SCOPE: Only help with the student\'s ASCEND journey and general study/career guidance',
  '(planning their path, choosing modules, understanding target universities/companies, workshops,',
  'certificates, resumes, study tips, career exploration). If asked for something off-topic, gently',
  'steer back. Do NOT do their homework or write their assignments for them - coach instead.',
  '',
  'RULES: Never give medical, legal or financial advice. Never guarantee admission, a job, a',
  'scholarship or any outcome - talk in terms of "improving your chances". Do not invent facts about',
  'universities, employers, prices or deadlines; tell them to verify on official sites. If a student',
  'seems to be in serious distress, respond with care and encourage them to talk to a trusted adult',
  'or a professional. Keep replies concise (a few short paragraphs max) and practical, and when useful',
  'point them to the right page in the app.',
  '',
  'LANGUAGE: Reply in the same language the student writes in - English or Bahasa Melayu.',
  '',
  'APP PAGES you can direct them to: Profile (set target field, interests, year/stage; university',
  'students also build their resume here), Path (their Ascent Path - complete steps to earn points),',
  'Modules (online courses matched to their field and year), Workshops (hackathons, competitions,',
  'career fairs), Vault (upload and verify certificates), Targets (matched universities for',
  'high-schoolers, companies for university students).',
].join('\n');

function line(label, value) {
  return `${label}: ${value && value.length ? value : 'not set'}`;
}

// Build the compact, student-specific grounding block from their own ASCEND data.
function buildContext(userId, pathType) {
  const profile = getProfile(userId);
  const journey = journeyRepo.getJourney(userId);
  const mods = listModules(userId, pathType);
  const recs = getRecommendations(userId, pathType);
  const events = listEvents(userId, pathType);

  const path = journey?.path || [];
  const active = path.find((m) => m.status === 'active');
  const completedSteps = path.filter((m) => m.status === 'completed').map((m) => m.title);
  const nextSteps = path.filter((m) => m.status === 'preview').slice(0, 3).map((m) => m.title);
  const doneMods = mods.filter((m) => m.status === 'completed').map((m) => m.title);
  const recMods = mods.filter((m) => m.recommended && m.status !== 'completed')
    .slice(0, 5).map((m) => `${m.title} (${m.level || 'n/a'})`);
  const topTargets = (recs.items || []).slice(0, 3).map((t) => `${t.name} (${t.score}% match)`);
  const recEvents = events.filter((e) => e.recommended || e.featured).slice(0, 3).map((e) => `${e.title} (${e.type})`);
  const firstName = (journey?.user?.displayName || '').split(' ')[0] || 'there';

  return [
    `Student first name: ${firstName}.`,
    `Path type: ${pathType === 'university' ? 'University student' : 'High-school student'}.`,
    line('Year/stage', profile.yearLevel),
    line('Target field', profile.targetField),
    line('Interests', (profile.interests || []).join(', ')),
    `Pathway Score: ${journey?.score ?? 0}.`,
    `Current step on their path: ${active ? active.title : 'none (path may be complete)'}.`,
    line('Completed steps', completedSteps.join('; ')),
    line('Upcoming steps', nextSteps.join('; ')),
    line('Completed modules', doneMods.join('; ')),
    line('Recommended modules for them', recMods.join('; ')),
    line(`Top ${recs.type || 'target'} matches`, topTargets.join('; ')),
    line('Suggested workshops/events', recEvents.join('; ')),
  ].join('\n');
}

// Keep only well-formed turns, cap length, and use the most recent slice (stateless history).
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }))
    .slice(-8);
}

/**
 * Answer the latest user turn. Returns { reply } or throws httpError. `reply` is null only if
 * the model is unavailable (client shows a graceful "try again" message).
 */
export async function chat(userId, pathType, messages) {
  const history = sanitizeMessages(messages);
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    const e = new Error('Send a message to the assistant.');
    e.status = 400;
    throw e;
  }
  const system = `${SYSTEM_BASE}\n\nSTUDENT CONTEXT (their own data - use it to personalise):\n${buildContext(userId, pathType)}`;
  const reply = await geminiChat(history, { system, maxTokens: 500 });
  return { reply: reply || null };
}
