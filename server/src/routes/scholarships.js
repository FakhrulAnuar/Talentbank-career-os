import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listScholarships } from '../services/scholarshipService.js';
import { getApplyGuide } from '../services/scholarshipGuideService.js';
import { geminiEnabled } from '../services/geminiService.js';

export const scholarshipsRouter = Router();

// GET /api/scholarships - profile-and-state-aware catalog. aiGuide tells the client whether to
// offer the optional "How to apply" button (only when a Gemini key is set).
scholarshipsRouter.get('/scholarships', requireAuth, (req, res) => {
  res.json({ scholarships: listScholarships(req.user.id), aiGuide: geminiEnabled() });
});

// POST /api/scholarships/:key/apply-guide - optional AI "how to apply" note (cached).
// Falls back to source:'rules' (text null) when the AI layer is off or unavailable.
scholarshipsRouter.post('/scholarships/:key/apply-guide', requireAuth, async (req, res) => {
  try {
    const out = await getApplyGuide(req.user.id, req.params.key);
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not build a guide.' });
  }
});
