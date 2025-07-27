import { Router } from 'express';
import endpointRoutes from './endpointRoutes';
import debugRoutes from './debugRoutes';
import authRoutes from './authRoutes';
const router = Router();

router.use('/endpoint', endpointRoutes);
router.use('/debug', debugRoutes);
router.use('/auth',authRoutes);
export default router;