import { Router } from "express";
import * as mediaController from "../controllers/mediaController";
import { authMiddleware } from "../../../middleware/authMiddleware";
import { relationshipGuard } from "../../../middleware/relationshipGuard";

const router = Router();

router.use(authMiddleware);
router.use(relationshipGuard);

router.post("/request-upload", mediaController.requestUpload);
router.post("/confirm-upload", mediaController.confirmUpload);

export default router;
