import { Router } from 'express';
import { createAgent, listAgents } from '../controllers/agent.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, listAgents);
router.post('/', authenticate, createAgent);

export default router;
