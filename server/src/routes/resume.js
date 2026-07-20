import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getResume, saveResume } from '../services/resumeService.js';

export const resumeRouter = Router();

// GET /api/resume - the user's resume doc + auto suggestions from their ASCEND activity.
resumeRouter.get('/resume', requireAuth, (req, res) => {
  const data = getResume(req.user.id);
  if (!data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

// PUT /api/resume - persist the edited resume document.
resumeRouter.put('/resume', requireAuth, (req, res) => {
  try {
    const resume = saveResume(req.user.id, req.body?.resume);
    res.json({ resume });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not save resume.' });
  }
});
