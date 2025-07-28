import { Router } from 'express';
import endpointRoutes from './endpointRoutes.js';
import debugRoutes from './debugRoutes.js';
import authRoutes from './authRoutes.js';
const router = Router();
router.use('/endpoint', endpointRoutes);
router.use('/debug', debugRoutes);
router.use('/auth', authRoutes);
export default router;
//# sourceMappingURL=index.js.map