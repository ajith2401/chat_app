import IORedis from "ioredis";
import { Server } from "socket.io";

// Subscribe to relationship events published by the service layer via Redis
// so all pods handle the event, not just the one that received the HTTP request.
export const initEventHandlers = (io: Server) => {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const sub = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  sub.subscribe("relationship-events");

  sub.on("message", (_channel: string, payload: string) => {
    try {
      const { event, data } = JSON.parse(payload);
      if (event === "relationship.joined") {
        // Notify both users so the Waiting Room auto-redirects
        io.to(`relationship:${data.relationshipId}`).emit("relationship_activated", {
          relationshipId: data.relationshipId,
        });
      }
    } catch {
      // malformed payload — ignore
    }
  });

  sub.on("error", (err) => {
    console.error("[eventHandlers] Redis subscriber error:", err.message);
  });
};
