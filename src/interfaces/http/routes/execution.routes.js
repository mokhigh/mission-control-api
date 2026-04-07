import { Router } from 'express';
import {
  createExecution,
  getExecutionsByTask,
  resumeExecution,
  streamExecutionLogs,
} from '../controllers/execution.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, createExecution);
router.get('/task/:taskId', authenticate, getExecutionsByTask);
router.post('/:id/resume', authenticate, resumeExecution);

// SSE — real-time log stream for an execution
router.get('/:id/logs/stream', authenticate, streamExecutionLogs);

export default router;
