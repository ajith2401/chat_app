import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as relationshipController from "../controllers/relationshipController";
import { authMiddleware } from "../../../middleware/authMiddleware";
import { relationshipGuard } from "../../../middleware/relationshipGuard";

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many join attempts. Try again later." },
});

const router = Router();
router.use(authMiddleware);

router.post("/create", relationshipController.createRelationship);
router.post("/join", joinLimiter, relationshipController.joinRelationship);
router.post("/mood", relationshipGuard, relationshipController.updateMood);
// NOT guarded: a user must see their OWN relationship even while it's pending
// (to show the invite code, and so the creator can mint the conversation key).
router.get("/me", relationshipController.getMyRelationship);

export default router;
