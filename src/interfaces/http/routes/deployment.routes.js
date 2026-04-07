import { Router } from 'express';
import {
  listDeployments,
  approveDeployment,
  rejectDeployment,
} from '../controllers/deployment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, listDeployments);
router.post('/:id/approve', authenticate, approveDeployment);
router.post('/:id/reject', authenticate, rejectDeployment);

export default router;
