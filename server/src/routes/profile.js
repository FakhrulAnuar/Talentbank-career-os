import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getProfile, saveProfile } from '../services/profileService.js';
import { completeActiveMilestone } from '../services/progressService.js';

export const profileRouter = Router();

// GET /api/profile
profileRouter.get('/profile', requireAuth, (req, res) => {
  res.json({ profile: getProfile(req.user.id) });
});

// PUT /api/profile — save, and satisfy the profile milestone if it's the active step.
profileRouter.put('/profile', requireAuth, (req, res) => {
  try {
    const profile = saveProfile(req.user.id, req.body?.profile);
    let milestoneCompleted = false;
    if (profile.targetField) {
      const key = req.user.pathType === 'university' ? 'uni_profile' : 'hs_profile';
      try {
        completeActiveMilestone(req.user.id, req.user.pathType, key, { viaAction: true });
        milestoneCompleted = true;
      } catch { /* not the active step — fine */ }
    }
    res.json({ profile, milestoneCompleted });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not save profile.' });
  }
});
