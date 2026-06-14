import { Router } from "express";
import { authMiddleware } from "../../../middleware/authMiddleware";
import { relationshipGuard } from "../../../middleware/relationshipGuard";
import * as keys from "../controllers/keysController";

const router = Router();

// Identity + device registration: available before a relationship is active.
router.post("/identity", authMiddleware, keys.publishIdentity);
router.get("/identity", authMiddleware, keys.getIdentity);
router.post("/device", authMiddleware, keys.registerDevice);

// CK distribution + AI grant: require an active relationship.
router.get("/bundle", authMiddleware, relationshipGuard, keys.getBundle);
router.post("/ck-shares", authMiddleware, relationshipGuard, keys.setCKShares);
router.get("/ck-shares", authMiddleware, relationshipGuard, keys.getCKShare);
router.post("/ai-grant", authMiddleware, relationshipGuard, keys.enableAIGrant);
router.delete("/ai-grant", authMiddleware, relationshipGuard, keys.disableAIGrant);

export default router;
