// Session guard. Rejects missing/expired sessions with 401 so no route ever leaks
// another user's data. Attaches a safe user object (no password hash) to req.user.
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { config } from '../config.js';
import { getValidSession, clearSessionCookie } from '../auth/sessions.js';

export function requireAuth(req, res, next) {
  const sid = req.cookies?.[config.cookieName];
  const session = getValidSession(sid);
  if (!session) {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Not authenticated' });
  }

  req.user = { id: user.id, displayName: user.displayName, email: user.email, pathType: user.pathType };
  req.sessionId = session.id;
  next();
}
