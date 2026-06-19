import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as journalService from "../services/journalService";
import { journalCreateSchema } from "@couple-chat/validation";

const VALID_TYPES = ["journal", "milestone"] as const;

export const getEntries = async (req: AuthRequest, res: Response) => {
  try {
    // Allowlist the type filter — never pass a raw query value into the Mongo
    // query (qs turns ?type[$ne]=x into an operator object => NoSQL injection).
    const t = req.query.type;
    const filter = typeof t === "string" && (VALID_TYPES as readonly string[]).includes(t) ? { type: t } : {};
    const entries = await journalService.getEntries(req.user.relationshipId, filter);
    res.json(entries);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const createEntry = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, type, moodTag } = journalCreateSchema.parse(req.body);
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
