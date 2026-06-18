import { Request, Response } from "express";
import * as authService from "../services/authService";
import { signupSchema, loginSchema } from "@couple-chat/validation";
import { AuthRequest, revokeToken } from "../../../middleware/authMiddleware";

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
    const { user, rawId } = await authService.signup(input);
    setAuthCookie(res, rawId);
    res.status(201).json({ user });
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
