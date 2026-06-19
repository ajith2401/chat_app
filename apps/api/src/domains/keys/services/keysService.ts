import { User, Relationship, MessageEmbedding } from "@couple-chat/database";
import mongoose from "mongoose";

// All values stored here are opaque to the server: public keys and ciphertext
// blobs the server can never decrypt. The server is a blind key directory.

export const publishIdentity = async (
  userId: string,
  data: {
    identityPub: string;
    wrappedIdPrivByPassword: Record<string, unknown>;
    wrappedIdPrivByRecovery: Record<string, unknown>;
  }
) => {
  return User.findByIdAndUpdate(
    userId,
    {
      identityPub: data.identityPub,
      wrappedIdPrivByPassword: data.wrappedIdPrivByPassword,
      wrappedIdPrivByRecovery: data.wrappedIdPrivByRecovery,
    },
    { new: true }
  ).select("identityPub devices");
};

export const getIdentity = async (userId: string) => {
  return User.findById(userId).select(
    "identityPub wrappedIdPrivByPassword wrappedIdPrivByRecovery devices"
  );
};

export const registerDevice = async (
  userId: string,
  device: { deviceId: string; devicePub: string }
) => {
  // Upsert by deviceId: re-registering the same device updates its key/lastSeen.
  const user = await User.findById(userId).select("devices");
  if (!user) throw new Error("User not found");
  const existing = user.devices.find((d) => d.deviceId === device.deviceId);
  if (existing) {
    existing.devicePub = device.devicePub;
    existing.lastSeen = new Date();
    existing.revokedAt = undefined;
  } else {
    user.devices.push({ deviceId: device.deviceId, devicePub: device.devicePub, lastSeen: new Date() });
  }
  await user.save();
  return user.devices;
};

const partnerIdOf = (rel: any, userId: string): mongoose.Types.ObjectId | null => {
  const u1 = rel.user1Id?.toString();
  const u2 = rel.user2Id?.toString();
  if (u1 === userId) return rel.user2Id ?? null;
  if (u2 === userId) return rel.user1Id ?? null;
  return null;
};

/** Returns the public-key bundle a client needs to seal CK to all active devices. */
export const getKeyBundle = async (relationshipId: string, userId: string) => {
  const rel = await Relationship.findById(relationshipId).select("user1Id user2Id");
  if (!rel) throw new Error("Relationship not found");
  const partnerId = partnerIdOf(rel, userId);

  const me = await User.findById(userId).select("identityPub devices");
  const partner = partnerId
    ? await User.findById(partnerId).select("identityPub devices")
    : null;

  const activeDevices = (u: any) =>
    (u?.devices ?? [])
      .filter((d: any) => !d.revokedAt)
      .map((d: any) => ({ deviceId: d.deviceId, devicePub: d.devicePub }));

  return {
    self: { userId, identityPub: me?.identityPub ?? null, devices: activeDevices(me) },
    partner: partner
      ? {
          userId: partnerId?.toString() ?? null,
          identityPub: partner.identityPub ?? null,
          devices: activeDevices(partner),
        }
      : null,
  };
};

export const setCKShares = async (
  relationshipId: string,
  callerId: string,
  shares: Array<{ deviceId: string; sealedCK: Record<string, unknown> }>
) => {
  const rel = await Relationship.findById(relationshipId).select("ckShares user1Id user2Id");
  if (!rel) throw new Error("Relationship not found");

  const partnerId = partnerIdOf(rel, callerId);
  const isCreator = rel.user1Id?.toString() === callerId;

  // A user may only write shares for devices/identities they're allowed to:
  //  - always: their own registered devices + their own identity marker
  //  - the relationship creator may also distribute to the partner's devices/identity
  const me = await User.findById(callerId).select("devices");
  const allowed = new Set<string>([`identity:${callerId}`, ...(me?.devices ?? []).map((d) => d.deviceId)]);
  if (isCreator && partnerId) {
    const partner = await User.findById(partnerId).select("devices");
    allowed.add(`identity:${partnerId.toString()}`);
    (partner?.devices ?? []).forEach((d) => allowed.add(d.deviceId));
  }

  const accepted = shares.filter((s) => allowed.has(s.deviceId));
  if (accepted.length === 0) throw new Error("No shares you're permitted to set");

  // Merge: replace existing share for a deviceId, append new ones.
  const byId = new Map(rel.ckShares.map((s) => [s.deviceId, s]));
  for (const s of accepted) byId.set(s.deviceId, { deviceId: s.deviceId, sealedCK: s.sealedCK });
  rel.ckShares = Array.from(byId.values());
  await rel.save();
  return rel.ckShares.map((s) => s.deviceId);
};

export const getCKShare = async (relationshipId: string, deviceId: string) => {
  const rel = await Relationship.findById(relationshipId).select("ckShares");
  if (!rel) throw new Error("Relationship not found");
  const share = rel.ckShares.find((s) => s.deviceId === deviceId);
  return share?.sealedCK ?? null;
};

export const enableAIGrant = async (
  relationshipId: string,
  wrappedCKForAI: Record<string, unknown>
) => {
  return Relationship.findByIdAndUpdate(
    relationshipId,
    {
      wrappedCKForAI,
      aiGrantedAt: new Date(),
      $unset: { aiRevokedAt: 1 },
      $inc: { aiGrantVersion: 1 },
      $addToSet: { "themePreferences.featureFlags": "ai-insights" },
    },
    { new: true }
  ).select("aiGrantVersion aiGrantedAt themePreferences");
};

export const disableAIGrant = async (relationshipId: string) => {
  const updated = await Relationship.findByIdAndUpdate(
    relationshipId,
    {
      aiRevokedAt: new Date(),
      $unset: { wrappedCKForAI: 1 },
      $pull: { "themePreferences.featureFlags": "ai-insights" },
    },
    { new: true }
  ).select("aiGrantVersion aiRevokedAt themePreferences");

  // Purge the derived embeddings so revoking truly removes AI's access to history.
  await MessageEmbedding.deleteMany({ relationshipId }).catch(() => {});
  return updated;
};
