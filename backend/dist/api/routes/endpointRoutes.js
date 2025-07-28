import { Router } from "express";
import { createEndPoint, pauseEndPoint, resumeEndpoint, getAllEndpoints, getEndpointById, updateEndpoint, deleteEndpoint, getEndpointMetrics } from "../controllers/endpointController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const router = Router();
router.use(authMiddleware);
router.get('/', getAllEndpoints);
router.post('/', createEndPoint);
router.get('/:id', getEndpointById);
router.put('/:id', updateEndpoint);
router.delete('/:id', deleteEndpoint);
router.post('/:id/pause', pauseEndPoint);
router.post('/:id/resume', resumeEndpoint);
router.get('/:id/metrics', getEndpointMetrics);
export default router;
//# sourceMappingURL=endpointRoutes.js.map