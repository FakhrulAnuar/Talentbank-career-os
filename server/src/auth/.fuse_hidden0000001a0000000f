// Server-side session store + cookie helpers. The cookie holds only an opaque random id.
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import { config } from '../config.js';

export function createSession(userId) {
  const id = randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + config.sessionTtlMs;
  db.insert(sessions).values({ id, userId, createdAt: now, expiresAt }).run();
  return { id, expiresAt };
}

export function getValidSession(id) {
  if (!id) return null;
  const s = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    db.delete(sessions).where(eq(sessions.id, id)).run(); // clean up expired
    return null;
  }
  return s;
}

export function destroySession(id) {
  if (id) db.delete(sessions).where(eq(sessions.id, id)).run();
}

export function setSessionCookie(res, id, expiresAt) {
  res.cookie(config.cookieName, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    expires: new Date(expiresAt),
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, { path: '/' });
}
