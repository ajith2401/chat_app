import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as journalService from "../services/journalService";

export const getEntries = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};
    const entries = await journalService.getEntries(req.user.relationshipId, filter);
    res.json(entries);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const createEntry = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, type, moodTag } = req.body;
    const entry = await journalService.createEntry({
      relationshipId: req.user.relationshipId,
      authorId: req.user._id,
      title,
      content,
      type,
      moodTag,
    });
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
