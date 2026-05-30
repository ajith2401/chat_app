import { Router } from "express";
import { signup, login, logout, getMe, updateMe } from "../controllers/authController";
import { authMiddleware } from "../../../middleware/authMiddleware";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);

export default router;
