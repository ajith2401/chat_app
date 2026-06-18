import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import * as push from "../services/pushService";

export const getVapidKey = (_req: AuthRequest, res: Response) => {
  res.json({ publicKey: push.vapidPublicKey(), enabled: push.pushConfigured() });
};

export const subscribe = async (req: AuthRequest, res: Response) => {
  const sub = req.body;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return res.status(400).json({ message: "Invalid subscription" });
  }
  await push.saveSubscription(req.user._id.toString(), sub);
  res.status(201).json({ ok: true });
};

export const unsubscribe = async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ message: "endpoint required" });
  await push.removeSubscription(req.user._id.toString(), endpoint);
  res.json({ ok: true });
};
