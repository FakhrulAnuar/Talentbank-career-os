import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { config } from '../config.js';
import { seedUserPath, ensureMilestones } from '../services/pathSeeder.js';
import { createSession, destroySession, setSessionCookie, clearSessionCookie } from '../auth/sessions.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

const PATH_TYPES = new Set(['highschool', 'university']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeUser(u) {
  return { id: u.id, displayName: u.displayName, email: u.email, pathType: u.pathType };
}

// POST /api/auth/signup — creates the account, seeds the chosen path, starts a session.
authRouter.post('/signup', (req, res) => {
  const { email, password, pathType } = req.body ?? {};
  const displayName = (req.body?.displayName || '').trim() || String(email || '').split('@')[0];

  if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Enter a valid email.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!PATH_TYPES.has(pathType)) return res.status(400).json({ error: 'Choose High School or University.' });

  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).get();
  if (existing) return res.status(409).json({ error: 'That email is already registered.' });

  ensureMilestones();
  const now = Date.now();
  const user = db.insert(users).values({
    displayName,
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
    pathType,
    createdAt: now,
  }).returning().get();

  seedUserPath(user.id, pathType);

  const { id, expiresAt } = createSession(user.id);
  setSessionCookie(res, id, expiresAt);
  res.status(201).json({ user: safeUser(user) });
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = db.select().from(users).where(eq(users.email, String(email || '').toLowerCase())).get();
  // Compare even on missing user to avoid leaking which emails exist.
  const ok = user ? bcrypt.compareSync(password || '', user.passwordHash) : bcrypt.compareSync(password || '', '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidin');
  if (!user || !ok) return res.status(401).json({ error: 'Incorrect email or password.' });

  const { id, expiresAt } = createSession(user.id);
  setSessionCookie(res, id, expiresAt);
  res.json({ user: safeUser(user) });
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  const sid = req.cookies?.[config.cookieName];
  destroySession(sid);
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me — current user, or 401 if not signed in.
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
