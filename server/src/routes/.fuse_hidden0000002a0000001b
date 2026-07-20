import { Router } from 'express';
import { journeyRepo } from '../data/journeyRepo.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { completeActiveMilestone } from '../services/progressService.js';

export const journeyRouter = Router();

// GET /api/journey — the signed-in user's Ascent Path.
journeyRouter.get('/journey', requireAuth, (req, res) => {
  const journey = journeyRepo.getJourney(req.user.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  res.json(journey);
});

// POST /api/journey/complete/:key — finish the active step, award points, light the next.
// Returns the fresh journey so the client renders authoritative server state.
journeyRouter.post('/journey/complete/:key', requireAuth, (req, res) => {
  try {
    completeActiveMilestone(req.user.id, req.user.pathType, req.params.key);
    const journey = journeyRepo.getJourney(req.user.id);
    res.json(journey);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not complete step.' });
  }
});
