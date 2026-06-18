import { Router } from "express";
import {
  signup, login, logout, getMe, updateMe,
  verifyEmail, resendVerification, forgotPassword, resetPassword,
} from "../controllers/authController";
import { authMiddleware } from "../../../middleware/authMiddleware";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);

// Email verification + password reset
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authMiddleware, resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
