import { Router } from 'express';
import { getToken } from '../controllers/auth.controller.js';

const router = Router();

router.post('/token', getToken);

export default router;
