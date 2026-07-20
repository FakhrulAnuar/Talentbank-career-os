import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listModules, completeModule } from '../services/moduleService.js';

export const modulesRouter = Router();

// GET /api/modules - catalog visible to the user's path, with their completion status.
modulesRouter.get('/modules', requireAuth, (req, res) => {
  res.json({ modules: listModules(req.user.id, req.user.pathType) });
});

// POST /api/modules/:key/complete - mark completed (idempotent), returns fresh list.
modulesRouter.post('/modules/:key/complete', requireAuth, (req, res) => {
  try {
    completeModule(req.user.id, req.user.pathType, req.params.key);
    res.json({ modules: listModules(req.user.id, req.user.pathType) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not complete module.' });
  }
});
