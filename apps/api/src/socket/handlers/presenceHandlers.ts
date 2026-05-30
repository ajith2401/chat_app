import { User } from "@couple-chat/database";
import { Socket, Server } from "socket.io";
import IORedis from "ioredis";
import { presenceStatusSchema } from "@couple-chat/validation";

// Shared ioredis instance — consistent with the rest of the codebase
const redisClient = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
redisClient.on("error", (err) => console.error("[presenceHandlers] Redis error:", err.message));

export const presenceHandlers = (io: Server, socket: Socket) => {
  const user = (socket as any).user;
  const relationshipRoom = `relationship:${user.relationshipId}`;
  const presenceKey = `presence:${user._id}`;

  const updatePresence = async (status: string) => {
    await redisClient.set(presenceKey, status, "EX", 60);
    if (user.presenceStatus !== status) {
      user.presenceStatus = status; // keep in-memory in sync to avoid double broadcasts
      await User.findByIdAndUpdate(user._id, { presenceStatus: status });
      io.to(relationshipRoom).emit("presence_update", { userId: user._id, status });
    }
  };

  socket.on("heartbeat", async () => {
    await updatePresence("online");
  });

  socket.on("status_update", async (data: unknown) => {
    const parsed = presenceStatusSchema.safeParse(data);
    if (!parsed.success) return;
    await updatePresence(parsed.data.status);
  });

  socket.on("disconnect", () => {
    setTimeout(async () => {
      const current = await redisClient.get(presenceKey);
      if (!current) {
        await User.findByIdAndUpdate(user._id, { presenceStatus: "offline" });
        io.to(relationshipRoom).emit("presence_update", { userId: user._id, status: "offline" });
      }
    }, 5000);
  });
};
