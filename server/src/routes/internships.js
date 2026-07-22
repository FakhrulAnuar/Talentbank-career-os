import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listInternships } from '../services/internshipService.js';
import { getInternshipGuide } from '../services/internshipGuideService.js';
import { geminiEnabled } from '../services/geminiService.js';

export const internshipsRouter = Router();

// GET /api/internships - profile-and-state-aware catalog. aiGuide flags the optional "How to
// apply" button (only when a Gemini key is set).
internshipsRouter.get('/internships', requireAuth, (req, res) => {
  res.json({ internships: listInternships(req.user.id), aiGuide: geminiEnabled() });
});

// POST /api/internships/:key/apply-guide - optional AI "how to apply / prep" note (cached).
internshipsRouter.post('/internships/:key/apply-guide', requireAuth, async (req, res) => {
  try {
    const out = await getInternshipGuide(req.user.id, req.params.key);
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not build a guide.' });
  }
});
