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
  const { system, maxTokens = 220, timeoutMs = 12000 } = opts;

  const url = `${ENDPOINT}/${encodeURIComponent(config.gemini.model)}:generateContent?key=${config.gemini.apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens },
    // Conservative safety for a student (possibly minor) audience.
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[gemini] API ${res.status} - falling back to rules`);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
    return text || null;
  } catch (e) {
    console.warn('[gemini] request failed - falling back to rules:', e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
