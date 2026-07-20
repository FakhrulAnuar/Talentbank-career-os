import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listModules, completeModule } from '../services/moduleService.js';
import { getCourseGuidance } from '../services/courseGuidanceService.js';
import { geminiEnabled } from '../services/geminiService.js';

export const modulesRouter = Router();

// GET /api/modules - catalog visible to the user's path, with their completion status.
// aiGuidance tells the client whether to fetch the optional AI ordering/note.
modulesRouter.get('/modules', requireAuth, (req, res) => {
  res.json({ modules: listModules(req.user.id, req.user.pathType), aiGuidance: geminiEnabled() });
});

// POST /api/modules/guidance - optional AI seniority-aware ordering + a short note (cached).
// Falls back to source:'rules' (nulls) when the AI layer is off or unavailable.
modulesRouter.post('/modules/guidance', requireAuth, async (req, res) => {
  try {
    const out = await getCourseGuidance(req.user.id, req.user.pathType);
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not get guidance.' });
  }
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
