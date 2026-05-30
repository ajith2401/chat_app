import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as memoryService from "../services/memoryService";

export const search = async (req: AuthRequest, res: Response) => {
  try {
    const { query, limit } = req.query;
    if (!query) return res.status(400).json({ message: "Query is required" });

    const results = await memoryService.semanticSearch(
      req.user.relationshipId,
      query as string,
      limit ? parseInt(limit as string) : 10
    );

    res.json(results);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
