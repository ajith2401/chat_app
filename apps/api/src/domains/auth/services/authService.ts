import { User } from "@couple-chat/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { LoginInput, SignupInput } from "@couple-chat/validation";

// Tokens are emailed in the clear but stored hashed, so a DB leak can't be replayed.
const genToken = () => crypto.randomBytes(32).toString("hex");
const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export const jwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
};

export const signToken = (userId: string, tokenVersion = 0) => {
  const jti = require("crypto").randomUUID() as string;
  return jwt.sign({ userId, jti, tv: tokenVersion }, jwtSecret(), { expiresIn: "7d" });
};

const safeUser = (user: any) => {
  const obj = user.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

export const signup = async (input: SignupInput) => {
  const existingUser = await User.findOne({ email: input.email });
  if (existingUser) throw new Error("User already exists");

  const passwordHash = await bcrypt.hash(input.password, 10);
  const verifyToken = genToken();
  const user = new User({
    email: input.email,
    passwordHash,
    name: input.name,
    emailVerifyToken: hashToken(verifyToken),
  });
  await user.save();

  // verifyToken (raw) is returned so the controller can email it; never stored raw.
  return { user: safeUser(user), rawId: user._id.toString(), verifyToken };
};

export const verifyEmail = async (token: string) => {
  if (!token) return false;
  const user = await User.findOne({ emailVerifyToken: hashToken(token) });
  if (!user) return false;
  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save();
  return true;
};

export const issueVerifyToken = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user || user.emailVerified) return null;
  const verifyToken = genToken();
  user.emailVerifyToken = hashToken(verifyToken);
  await user.save();
  return { email: user.email, verifyToken };
};

export const requestPasswordReset = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) return null; // caller still responds 200 (don't leak existence)
  const resetToken = genToken();
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await user.save();
  return { email: user.email, resetToken };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) throw new Error("Invalid or expired reset link");
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate every previously-issued JWT (stolen sessions die on reset).
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  return true;
};

export const login = async (input: LoginInput) => {
  const user = await User.findOne({ email: input.email });
  if (!user) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) throw new Error("Invalid credentials");

  return { user: safeUser(user), rawId: user._id.toString() };
};

const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\//;

export const updateProfile = async (userId: string, data: { name?: string; avatarUrl?: string }) => {
  if (data.avatarUrl && !CLOUDINARY_URL_RE.test(data.avatarUrl)) {
    throw new Error("avatarUrl must be a Cloudinary URL");
  }
  return await User.findByIdAndUpdate(userId, data, { new: true }).select("-passwordHash");
};
