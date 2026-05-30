import { User } from "@couple-chat/database";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import IORedis from "ioredis";

export interface AuthRequest extends Request {
  user?: any;
}

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
redis.on("error", (err) => console.error("[authMiddleware] Redis error:", err.message));

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.auth_token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (decoded.jti) {
      const revoked = await redis.get(`jti:${decoded.jti}`);
      if (revoked) return res.status(401).json({ message: "Token revoked" });
    }

    const user = await User.findById(decoded.userId).select("-passwordHash -__v");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const revokeToken = async (token: string) => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded?.jti || !decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis.set(`jti:${decoded.jti}`, "1", "EX", ttl);
  } catch { /* ignore */ }
};
