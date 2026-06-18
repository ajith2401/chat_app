import { Request, Response } from "express";
import * as authService from "../services/authService";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService";
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@couple-chat/validation";
import { AuthRequest, revokeToken } from "../../../middleware/authMiddleware";

const APP_URL = (process.env.CLIENT_URL || "http://localhost:3005").split(",")[0].trim();

// In production the web (Vercel) and API (Koyeb) live on different sites, so the
// auth cookie must be SameSite=None + Secure to be sent cross-site. Locally we
// keep Strict for CSRF hardening.
const isProd = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "strict") as "none" | "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const setAuthCookie = (res: Response, userId: string) => {
  const token = authService.signToken(userId);
  res.cookie("auth_token", token, COOKIE_OPTIONS);
};

export const signup = async (req: Request, res: Response) => {
  try {
    const input = signupSchema.parse(req.body);
    const { user, rawId, verifyToken } = await authService.signup(input);
    setAuthCookie(res, rawId);
    // Send verification email — non-blocking; signup succeeds even if email fails.
    sendVerificationEmail(user.email, verifyToken).catch((e) =>
      console.error("verification email failed:", e?.message)
    );
    res.status(201).json({ user });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const token = String(req.query.token || "");
  const ok = await authService.verifyEmail(token);
  // Redirect back into the app either way (links are one-time).
  res.redirect(`${APP_URL}/?verified=${ok ? "1" : "0"}`);
};

export const resendVerification = async (req: AuthRequest, res: Response) => {
  const result = await authService.issueVerifyToken(req.user._id.toString());
  if (result) {
    sendVerificationEmail(result.email, result.verifyToken).catch((e) =>
      console.error("resend verification failed:", e?.message)
    );
  }
  res.json({ ok: true });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await authService.requestPasswordReset(email);
    if (result) {
      sendPasswordResetEmail(result.email, result.resetToken).catch((e) =>
        console.error("reset email failed:", e?.message)
      );
    }
    // Always 200 — never reveal whether an account exists.
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const { user, rawId } = await authService.login(input);
    setAuthCookie(res, rawId);
    res.json({ user });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.auth_token;
  if (token) await revokeToken(token);
  res.clearCookie("auth_token", { path: "/" });
  res.json({ ok: true });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  res.json(req.user);
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatarUrl } = req.body;
    const user = await authService.updateProfile(req.user._id, { name, avatarUrl });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
