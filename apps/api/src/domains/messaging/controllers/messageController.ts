import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as messageService from "../services/messageService";

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { limit, before } = req.query;
    const rawLimit = parseInt(limit as string) || 50;
    const safeLimit = Math.min(Math.max(rawLimit, 1), 100);
    const messages = await messageService.getMessages(req.user.relationshipId, safeLimit, before as string);
    res.json(messages);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const markSeen = async (req: AuthRequest, res: Response) => {
  try {
    await messageService.markMessagesAsSeen(req.user.relationshipId, req.user._id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
