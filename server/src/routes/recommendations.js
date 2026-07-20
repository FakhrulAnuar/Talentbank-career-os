import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getRecommendations } from '../services/recommendationService.js';
import { explainMatch } from '../services/explanationService.js';

export const recommendationsRouter = Router();

// GET /api/recommendations - full scored target list for the user's path.
recommendationsRouter.get('/recommendations', requireAuth, (req, res) => {
  res.json(getRecommendations(req.user.id, req.user.pathType));
});

// POST /api/recommendations/:key/explain - on-demand AI "why this fits you" (cached).
// Falls back to source:'rules' (text null) when the AI layer is off or unavailable.
recommendationsRouter.post('/recommendations/:key/explain', requireAuth, async (req, res) => {
  try {
    const out = await explainMatch(req.user.id, req.user.pathType, req.params.key);
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not explain this match.' });
  }
});
