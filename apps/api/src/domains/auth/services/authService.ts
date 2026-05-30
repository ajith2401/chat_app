import { User } from "@couple-chat/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { LoginInput, SignupInput } from "@couple-chat/validation";

export const jwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
};

export const signToken = (userId: string) => {
  const jti = require("crypto").randomUUID() as string;
  return jwt.sign({ userId, jti }, jwtSecret(), { expiresIn: "7d" });
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
  const user = new User({ email: input.email, passwordHash, name: input.name });
  await user.save();

  return { user: safeUser(user), rawId: user._id.toString() };
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
