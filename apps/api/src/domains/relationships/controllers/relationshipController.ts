import { Response } from "express";
import IORedis from "ioredis";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as relationshipService from "../services/relationshipService";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
redis.on("error", () => {});

export const createRelationship = async (req: AuthRequest, res: Response) => {
  try {
    const rel = await relationshipService.createRelationship(req.user._id);
    res.status(201).json({ inviteCode: rel.inviteCode, status: rel.status });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const joinRelationship = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;
    await relationshipService.joinRelationship(req.user._id, inviteCode);
    res.json({ status: "active" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updateMood = async (req: AuthRequest, res: Response) => {
  try {
    const { mood } = req.body;
    await relationshipService.updateMood(req.user.relationshipId, mood);
    // Broadcast to all pods via Redis so both users' AmbientBackground updates
    redis.publish("mood-updates", JSON.stringify({
      relationshipId: req.user.relationshipId.toString(),
      mood,
      intensity: 0.5,
    })).catch(() => {});
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getMyRelationship = async (req: AuthRequest, res: Response) => {
  try {
    const result = await relationshipService.getMyRelationship(req.user.relationshipId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
