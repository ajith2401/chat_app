import { Router } from "express";
import { authMiddleware } from "../../../middleware/authMiddleware";
import { getVapidKey, subscribe, unsubscribe } from "../controllers/notificationsController";

const router = Router();

router.get("/vapid-public-key", authMiddleware, getVapidKey);
router.post("/subscribe", authMiddleware, subscribe);
router.post("/unsubscribe", authMiddleware, unsubscribe);

export default router;
