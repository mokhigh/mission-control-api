import { Router } from 'express';
import {
  createTask,
  listTasks,
  getTask,
  updateTaskStatus,
} from '../controllers/task.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// POST /tasks is called by trello-watcher — uses a service token
router.post('/', authenticate, createTask);
router.get('/', authenticate, listTasks);
router.get('/:id', authenticate, getTask);
router.patch('/:id/status', authenticate, updateTaskStatus);

export default router;
