import { Router } from "express";
import * as messageController from "../controllers/messageController";
import { authMiddleware } from "../../../middleware/authMiddleware";
import { relationshipGuard } from "../../../middleware/relationshipGuard";

const router = Router();

router.use(authMiddleware);
router.use(relationshipGuard);

router.get("/", messageController.getMessages);
router.post("/mark-seen", messageController.markSeen);

export default router;
