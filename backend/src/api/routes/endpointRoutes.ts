// routes/endpointRoutes.ts
import { Router } from "express";
import { 
    createEndPoint, 
    pauseEndPoint, 
    resumeEndpoint, 
    getAllEndpoints,
    getEndpointById,
    updateEndpoint,
    deleteEndpoint
} from "../controllers/endpointController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get('/', getAllEndpoints);
router.post('/', createEndPoint);
router.get('/:id', getEndpointById);
router.put('/:id', updateEndpoint);
router.delete('/:id', deleteEndpoint);
router.post('/:id/pause', pauseEndPoint);
router.post('/:id/resume', resumeEndpoint);


export default router;