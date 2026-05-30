import { Relationship, User } from "@couple-chat/database";
import { randomInt } from "crypto";
import IORedis from "ioredis";
import mongoose from "mongoose";

const redisPublisher = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[randomInt(chars.length)];
  return `LOVE-${code}`;
};

export const createRelationship = async (user1Id: string) => {
  const user = await User.findById(user1Id);
  if (!user) throw new Error("User not found");
  if (user.relationshipId) throw new Error("User already in a relationship");

  const relationship = new Relationship({
    user1Id: new mongoose.Types.ObjectId(user1Id),
    inviteCode: generateInviteCode(),
    status: "pending",
  });

  await relationship.save();
  user.relationshipId = relationship._id as mongoose.Types.ObjectId;
  await user.save();

  return relationship;
};

export const joinRelationship = async (userId: string, inviteCode: string) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.relationshipId) throw new Error("User already in a relationship");

  const relationship = await Relationship.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!relationship) throw new Error("Invalid Invite Code");
  if (relationship.user2Id) throw new Error("Relationship already full");

  relationship.user2Id = new mongoose.Types.ObjectId(userId);
  relationship.status = "active";
  relationship.inviteCode = undefined;
  await relationship.save();

  user.relationshipId = relationship._id as mongoose.Types.ObjectId;
  await user.save();

  // Publish cross-pod so the Waiting Room on any pod gets the activation event
  redisPublisher.publish(
    "relationship-events",
    JSON.stringify({ event: "relationship.joined", data: { relationshipId: relationship._id.toString() } })
  ).catch(() => {});

  return relationship;
};

export const updateMood = async (relationshipId: string, mood: string) => {
  return await Relationship.findByIdAndUpdate(relationshipId, { currentMood: mood }, { new: true });
};

export const getMyRelationship = async (relationshipId: string) => {
  return await Relationship.findById(relationshipId)
    .populate("user1Id", "name avatarUrl presenceStatus")
    .populate("user2Id", "name avatarUrl presenceStatus");
};
