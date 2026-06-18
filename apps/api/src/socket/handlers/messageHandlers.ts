import { Message, Relationship } from "@couple-chat/database";
import { Socket, Server } from "socket.io";
import { markMessagesAsSeen } from "../../domains/messaging/services/messageService";
import { addAIJob } from "../../lib/queue";
import { sendPushToUser } from "../../domains/notifications/services/pushService";
import { sendMessageSchema, messageSeenSchema, batchSeenSchema } from "@couple-chat/validation";

export const messageHandlers = (io: Server, socket: Socket) => {
  const user = (socket as any).user;
  const relationshipRoom = `relationship:${user.relationshipId}`;

  socket.on("send_message", async (data: any, ack?: Function) => {
    try {
      const parsed = sendMessageSchema.safeParse(data);
      if (!parsed.success) {
        if (ack) ack({ error: parsed.error.issues.map(i => i.message).join(", ") });
        return;
      }
      const { clientGeneratedId, content, type, mediaUrl, replyTo, enc, mediaKey } = parsed.data;

      const message = new Message({
        relationshipId: user.relationshipId,
        senderId: user._id,
        clientGeneratedId,
        content, // ciphertext when enc is present
        type,
        mediaUrl,
        enc,
        mediaKey,
        replyTo,
        status: { sentAt: new Date() },
      });

      await message.save();
      if (replyTo) await message.populate("replyTo");

      io.to(relationshipRoom).emit("receive_message", message);

      // One lookup for both the AI gate and finding the partner to notify.
      const rel = await Relationship.findById(user.relationshipId).select("wrappedCKForAI user1Id user2Id");

      // Enqueue AI job only when this couple has opted in (CK sealed to AI key).
      if (type === "text" && rel?.wrappedCKForAI) {
        addAIJob({
          messageId: message._id.toString(),
          relationshipId: user.relationshipId.toString(),
        }).catch(() => {});
      }

      // Web push to the partner — generic (no plaintext; messages are E2E-encrypted).
      const partnerId =
        rel?.user1Id?.toString() === user._id.toString() ? rel?.user2Id : rel?.user1Id;
      if (partnerId) {
        const body =
          type === "image" ? "📷 Sent you a photo" :
          type === "voice" ? "🎙️ Sent a voice note" :
          "💜 New whisper for you";
        sendPushToUser(partnerId.toString(), {
          title: user.name || "Your partner",
          body,
          url: "/chat",
        }).catch(() => {});
      }

      if (ack) ack({ ok: true });
    } catch (err: any) {
      if (ack) ack({ error: "Failed to send message" });
    }
  });

  // Batched seen receipts — replaces per-message message_seen hammering
  socket.on("messages_seen_batch", async (data: any) => {
    try {
      const parsed = batchSeenSchema.safeParse(data);
      if (!parsed.success) return;
      const { messageIds } = parsed.data;

      const now = new Date();
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          relationshipId: user.relationshipId,
          senderId: { $ne: user._id },
          "status.seenAt": { $exists: false },
        },
        { $set: { "status.seenAt": now } }
      );

      io.to(relationshipRoom).emit("messages_seen_bulk", { messageIds, seenAt: now, seenBy: user._id });
    } catch {
      socket.emit("error", { message: "Failed to mark messages as seen" });
    }
  });

  socket.on("mark_all_seen", async () => {
    try {
      await markMessagesAsSeen(user.relationshipId.toString(), user._id.toString());
      io.to(relationshipRoom).emit("all_messages_seen", { seenAt: new Date(), seenBy: user._id });
    } catch {
      socket.emit("error", { message: "Failed to mark messages as seen" });
    }
  });

  socket.on("typing_start", () => {
    socket.to(relationshipRoom).emit("user_typing", { userId: user._id, name: user.name, isTyping: true });
  });

  socket.on("typing_stop", () => {
    socket.to(relationshipRoom).emit("user_typing", { userId: user._id, isTyping: false });
  });
};
