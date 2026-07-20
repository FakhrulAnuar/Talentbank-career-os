import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getRecommendations } from '../services/recommendationService.js';

export const recommendationsRouter = Router();

// GET /api/recommendations — full scored target list for the user's path.
recommendationsRouter.get('/recommendations', requireAuth, (req, res) => {
  res.json(getRecommendations(req.user.id, req.user.pathType));
});
