import { Router } from "express";
import * as journalController from "../controllers/journalController";
import { authMiddleware } from "../../../middleware/authMiddleware";
import { relationshipGuard } from "../../../middleware/relationshipGuard";

const router = Router();

router.use(authMiddleware);
router.use(relationshipGuard);

router.get("/", journalController.getEntries);
router.post("/", journalController.createEntry);

export default router;
