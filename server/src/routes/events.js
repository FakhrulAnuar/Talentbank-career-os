import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listEvents } from '../services/eventService.js';

export const eventsRouter = Router();

// GET /api/events - profile-aware workshops/tournaments catalog for the user's path.
eventsRouter.get('/events', requireAuth, (req, res) => {
  res.json({ events: listEvents(req.user.id, req.user.pathType) });
});
