import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as keysService from "../services/keysService";
import {
  publishIdentitySchema,
  registerDeviceSchema,
  ckSharesSchema,
  aiGrantSchema,
} from "@couple-chat/validation";

export const publishIdentity = async (req: AuthRequest, res: Response) => {
  try {
    const input = publishIdentitySchema.parse(req.body);
    const result = await keysService.publishIdentity(req.user._id.toString(), input);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getIdentity = async (req: AuthRequest, res: Response) => {
  const result = await keysService.getIdentity(req.user._id.toString());
  res.json(result);
};

export const registerDevice = async (req: AuthRequest, res: Response) => {
  try {
    const input = registerDeviceSchema.parse(req.body);
    const devices = await keysService.registerDevice(req.user._id.toString(), input);
    res.status(201).json({ devices });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getBundle = async (req: AuthRequest, res: Response) => {
  try {
    const bundle = await keysService.getKeyBundle(
      req.user.relationshipId.toString(),
      req.user._id.toString()
    );
    res.json(bundle);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const setCKShares = async (req: AuthRequest, res: Response) => {
  try {
    const { shares } = ckSharesSchema.parse(req.body);
    const deviceIds = await keysService.setCKShares(
      req.user.relationshipId.toString(),
      req.user._id.toString(),
      shares
    );
    res.status(201).json({ deviceIds });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getCKShare = async (req: AuthRequest, res: Response) => {
  const deviceId = String(req.query.deviceId || "");
  if (!deviceId) return res.status(400).json({ message: "deviceId required" });
  const sealedCK = await keysService.getCKShare(req.user.relationshipId.toString(), deviceId);
  if (!sealedCK) return res.status(404).json({ message: "No CK share for this device" });
  res.json({ sealedCK });
};

export const enableAIGrant = async (req: AuthRequest, res: Response) => {
  try {
    const { wrappedCKForAI } = aiGrantSchema.parse(req.body);
    const result = await keysService.enableAIGrant(
      req.user.relationshipId.toString(),
      wrappedCKForAI
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const disableAIGrant = async (req: AuthRequest, res: Response) => {
  const result = await keysService.disableAIGrant(req.user.relationshipId.toString());
  res.json(result);
};
