// Shared, server-side Gemini (Google AI) client. Every AI feature routes through here so
// there is ONE place that holds the key, enforces the no-op-without-key rule, applies a
// timeout, and keeps the API surface small. The key lives only in server env (config.gemini).
//
// Design rules (see CLAUDE.md §7):
//  - Rules stay authoritative. Gemini only phrases; it never ranks or decides eligibility.
//  - No-op without a key: geminiEnabled() is false, geminiGenerate() returns null, and every
//    caller must fall back to its rule-based output. Nothing breaks when the key is absent.
//  - Never send PII. Callers pass only anonymized signals (fields, tags, rule reasons).
import { config } from '../config.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** True only when a Gemini key is configured. Callers gate the feature on this. */
export function geminiEnabled() {
  return Boolean(config.gemini.apiKey);
}

/**
 * Generate a short text completion. Returns the trimmed string, or null on any problem
 * (no key, network/API error, empty/blocked response) so callers can fall back gracefully.
 * @param {string} prompt        the user turn (already anonymized by the caller)
 * @param {object} [opts]
 * @param {string} [opts.system] optional system instruction (guardrails)
 * @param {number} [opts.maxTokens]
 * @param {number} [opts.timeoutMs]
 */
export async function geminiGenerate(prompt, opts = {}) {
  if (!geminiEnabled()) return null;
  const { system, maxTokens = 220, timeoutMs = 30000 } = opts;

  // Auth via the x-goog-api-key header (not the ?key= query param) so both the legacy
  // 'AIza' standard keys and the newer 'AQ.' auth keys work. See callGemini().
  const url = `${ENDPOINT}/${encodeURIComponent(config.gemini.model)}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // thinkingBudget:0 disables internal "thinking" on 2.5+/3 flash models, so the whole token
    // budget goes to the actual answer (otherwise short replies get truncated) and it's faster.
    generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
    // Conservative safety for a student (possibly minor) audience.
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  return callGemini(url, body, timeoutMs);
}

/**
 * Multi-turn chat completion for the grounded assistant. `messages` is the recent transcript
 * as [{ role: 'user'|'assistant', content }]; `system` carries the guardrails + grounding.
 * Returns the reply text, or null on any problem (no key, error, blocked) so the caller can
 * degrade gracefully. Same safety settings and timeout as generate().
 */
export async function geminiChat(messages, opts = {}) {
  if (!geminiEnabled()) return null;
  const { system, maxTokens = 800, timeoutMs = 40000 } = opts;

  const contents = (messages || [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  if (contents.length === 0) return null;

  // Auth via the x-goog-api-key header (not the ?key= query param) so both the legacy
  // 'AIza' standard keys and the newer 'AQ.' auth keys work. See callGemini().
  const url = `${ENDPOINT}/${encodeURIComponent(config.gemini.model)}:generateContent`;
  const body = {
    contents,
    // thinkingBudget:0 disables internal "thinking" so the full budget goes to the reply.
    generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  return callGemini(url, body, timeoutMs);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Transient, Google-side statuses worth retrying: overloaded (503), server error (500),
// and rate limit (429). Other failures (bad key, bad model, blocked content) are terminal.
const RETRIABLE = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 3;

// Shared POST + parse used by both generate() and chat(). Retries transient errors with a
// short backoff so a single "model overloaded" (503) doesn't surface as a failure.
async function callGemini(url, body, timeoutMs) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.gemini.apiKey, // works for both 'AIza' and 'AQ.' key types
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
        return text || null;
      }
      const detail = await res.text().catch(() => '');
      if (RETRIABLE.has(res.status) && attempt < MAX_ATTEMPTS) {
        console.warn(`[gemini] API ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS}) - retrying…`);
        clearTimeout(timer);
        await sleep(attempt * 1500); // 1.5s, 3s backoff
        continue;
      }
      console.warn(`[gemini] API ${res.status} - falling back to rules. Detail: ${detail.slice(0, 500)}`);
      return null;
    } catch (e) {
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[gemini] request failed (attempt ${attempt}/${MAX_ATTEMPTS}) - retrying… ${e.message}`);
        clearTimeout(timer);
        await sleep(attempt * 1500);
        continue;
      }
      console.warn('[gemini] request failed - falling back to rules:', e.message);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
