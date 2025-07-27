import { Router } from 'express';
import { clearQueue, testEmail } from '../controllers/debugController';

const router = Router();

router.post('/clear-queue', clearQueue);
router.post('/test-email', testEmail);

export default router;