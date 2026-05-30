import { Message } from "@couple-chat/database";
import { Socket, Server } from "socket.io";
import { markMessagesAsSeen } from "../../domains/messaging/services/messageService";
import { addAIJob } from "../../lib/queue";
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
      const { clientGeneratedId, content, type, mediaUrl, replyTo } = parsed.data;

      const message = new Message({
        relationshipId: user.relationshipId,
        senderId: user._id,
        clientGeneratedId,
        content,
        type,
        mediaUrl,
        replyTo,
        status: { sentAt: new Date() },
      });

      await message.save();
      if (replyTo) await message.populate("replyTo");

      io.to(relationshipRoom).emit("receive_message", message);

      // Directly enqueue AI job — no in-process EventBus (cross-pod safe)
      if (type === "text") {
        addAIJob({ messageId: message._id.toString(), relationshipId: user.relationshipId.toString(), content }).catch(() => {});
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
