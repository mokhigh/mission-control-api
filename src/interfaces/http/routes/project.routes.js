import { Router } from 'express';
import { createProject, listProjects, getProject } from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, createProject);
router.get('/', authenticate, listProjects);
router.get('/:id', authenticate, getProject);

export default router;
