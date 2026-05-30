import { Relationship } from "@couple-chat/database";
import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export const relationshipGuard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.relationshipId) {
    return res.status(403).json({ message: "No active relationship found." });
  }
  const rel = await Relationship.findById(req.user.relationshipId).select("status");
  if (!rel || rel.status !== "active") {
    return res.status(403).json({ message: "Relationship is not yet active." });
  }
  next();
};
