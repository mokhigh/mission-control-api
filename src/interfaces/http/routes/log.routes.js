import { Router } from 'express';
import { getLogsByExecution } from '../controllers/log.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:executionId', authenticate, getLogsByExecution);

export default router;
