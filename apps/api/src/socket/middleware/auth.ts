import { User } from "@couple-chat/database";
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import IORedis from "ioredis";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
redis.on("error", (err) => console.error("[socketAuth] Redis error:", err.message));

const parseCookie = (cookieHeader: string, name: string): string | null => {
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${name}=`));
  return match ? match.trim().slice(name.length + 1) : null;
};

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  // Prefer HttpOnly cookie; fall back to handshake.auth.token for legacy/native clients
  const cookieHeader = socket.handshake.headers.cookie || "";
  const token =
    parseCookie(cookieHeader, "auth_token") ||
    socket.handshake.auth?.token ||
    null;

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Mirror the HTTP authMiddleware: reject revoked tokens (logout) so a
    // logged-out/stolen token can't keep a live WebSocket open.
    if (decoded.jti) {
      const revoked = await redis.get(`jti:${decoded.jti}`);
      if (revoked) return next(new Error("Authentication error: Token revoked"));
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Reject tokens issued before a password reset (token-version mismatch).
    if (typeof decoded.tv === "number" && decoded.tv !== (user.tokenVersion ?? 0)) {
      return next(new Error("Authentication error: Token expired"));
    }

    if (!user.relationshipId) {
      return next(new Error("Authentication error: No active relationship"));
    }

    (socket as any).user = user;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
};
