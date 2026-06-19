import { Message } from "@couple-chat/database";

export const getMessages = async (relationshipId: string, limit: number = 50, before?: string) => {
  const query: any = { relationshipId, deletedAt: { $exists: false } };
  if (before) {
    const d = new Date(before);
    // Ignore an unparseable cursor rather than silently returning no results.
    if (!Number.isNaN(d.getTime())) query.createdAt = { $lt: d };
  }

  return await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("replyTo");
};

export const markMessagesAsSeen = async (relationshipId: string, userId: string) => {
  return await Message.updateMany(
    {
      relationshipId,
      senderId: { $ne: userId },
      "status.seenAt": { $exists: false },
    },
    { $set: { "status.seenAt": new Date() } }
  );
};
