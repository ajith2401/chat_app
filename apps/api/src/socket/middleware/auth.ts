import { User } from "@couple-chat/database";
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

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
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error("Authentication error: User not found"));
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
