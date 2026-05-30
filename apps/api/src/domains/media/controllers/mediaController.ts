import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as storageService from "../services/storageService";
import { addMediaJob } from "../../../lib/queue";

const ALLOWED_FOLDERS = ["chat", "avatar"] as const;

export const requestUpload = async (req: AuthRequest, res: Response) => {
  try {
    const { folder = "chat" } = req.body;
    if (!(ALLOWED_FOLDERS as readonly string[]).includes(folder)) {
      return res.status(400).json({ message: "Invalid upload folder" });
    }

    const targetFolder = `relationships/${req.user.relationshipId}/${folder}`;
    const signatureData = storageService.getUploadSignature(targetFolder);
    res.json({ ...signatureData, folder: targetFolder });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const confirmUpload = async (req: AuthRequest, res: Response) => {
  try {
    const { fileKey, type } = req.body;
    if (typeof fileKey !== "string") {
      return res.status(400).json({ message: "Invalid fileKey" });
    }

    // Ownership check — reject files outside this relationship's folder
    const expectedPrefix = `relationships/${req.user.relationshipId}/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await addMediaJob({ relationshipId: req.user.relationshipId, userId: req.user._id, fileKey, type });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
