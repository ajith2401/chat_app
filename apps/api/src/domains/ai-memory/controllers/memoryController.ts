import { Response } from "express";
import { Relationship } from "@couple-chat/database";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as memoryService from "../services/memoryService";

export const search = async (req: AuthRequest, res: Response) => {
  try {
    // Only serve semantic search while AI is currently opted in — revoking the
    // grant must immediately stop access to the conversation history.
    const rel = await Relationship.findById(req.user.relationshipId).select("wrappedCKForAI");
    if (!rel?.wrappedCKForAI) {
      return res.status(403).json({ message: "AI insights are turned off for this relationship." });
    }

    // Bound the inputs: cap query length (OpenAI cost) and result count (Atlas DoS).
    const query = String(req.query.query || "").slice(0, 500).trim();
    if (!query) return res.status(400).json({ message: "Query is required" });
    const rawLimit = parseInt(String(req.query.limit ?? "10"), 10);
    const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 10 : rawLimit, 1), 50);

    const results = await memoryService.semanticSearch(req.user.relationshipId, query, limit);
    res.json(results);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
