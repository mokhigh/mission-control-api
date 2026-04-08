import { Router } from 'express';
import { verifyToken } from '../../../shared/utils/jwt.js';
import { sseHub } from '../../../infrastructure/realtime/sse.js';

const router = Router();

/**
 * GET /events
 *
 * Global SSE stream for dashboard real-time updates.
 * EventSource does not support custom headers, so the JWT is accepted
 * via the `token` query param in addition to the Authorization header.
 *
 * Events emitted: task.created, task.updated, deployment.created, deployment.updated
 */
router.get('/', (req, res) => {
  const token = req.headers.authorization?.slice(7) ?? req.query.token;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  sseHub.subscribeGlobal(res);
});

export default router;
