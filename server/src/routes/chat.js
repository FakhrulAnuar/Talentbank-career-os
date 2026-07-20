import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { chat, chatEnabled, isRateLimited } from '../services/chatService.js';

export const chatRouter = Router();

// GET /api/chat/status - whether the assistant is available (a Gemini key is set).
// The client hides the launcher entirely when disabled.
chatRouter.get('/chat/status', requireAuth, (_req, res) => {
  res.json({ enabled: chatEnabled() });
});

// POST /api/chat - grounded reply to the latest turn. Body: { messages: [{role,content}] }.
chatRouter.post('/chat', requireAuth, async (req, res) => {
  if (!chatEnabled()) {
    return res.status(503).json({ error: 'The assistant is not enabled.' });
  }
  if (isRateLimited(req.user.id)) {
    return res.status(429).json({ error: 'You are sending messages too fast. Please wait a moment.' });
  }
  try {
    const out = await chat(req.user.id, req.user.pathType, req.body?.messages);
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'The assistant could not reply.' });
  }
});
