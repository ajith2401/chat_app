import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as relationshipService from "../services/relationshipService";

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
