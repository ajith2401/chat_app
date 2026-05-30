import { Router } from "express";
import * as memoryController from "../controllers/memoryController";
import { authMiddleware } from "../../../middleware/authMiddleware";
import { relationshipGuard } from "../../../middleware/relationshipGuard";

const router = Router();

router.use(authMiddleware);
router.use(relationshipGuard);

router.get("/search", memoryController.search);

export default router;
