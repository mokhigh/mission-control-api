import { Router } from 'express';
import { Queue } from 'bullmq';
import { getRedis } from '../../../infrastructure/cache/redis.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.delete('/queues/:name', authenticate, async (req, res, next) => {
  try {
    const queue = new Queue(req.params.name, { connection: getRedis() });
    await queue.obliterate({ force: true });
    await queue.close();
    res.json({ message: `Queue "${req.params.name}" cleared` });
  } catch (err) {
    next(err);
  }
});

export default router;
