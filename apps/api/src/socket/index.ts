import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import { socketAuthMiddleware } from "./middleware/auth";
import { messageHandlers } from "./handlers/messageHandlers";
import { presenceHandlers } from "./handlers/presenceHandlers";
import { callHandlers } from "./handlers/callHandlers";

export const initSocket = (httpServer: HttpServer) => {
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3005").split(",").map(s => s.trim());

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const pubClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate();
  const moodSubClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Receive emotion results published by the worker
  moodSubClient.subscribe("mood-updates");
  moodSubClient.on("message", (_channel: string, payload: string) => {
    try {
      const { relationshipId, mood, intensity } = JSON.parse(payload);
      io.to(`relationship:${relationshipId}`).emit("mood_changed", { mood, intensity });
    } catch {
      // malformed payload — ignore
    }
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    const relationshipRoom = `relationship:${user.relationshipId}`;

    socket.join(relationshipRoom);
    console.log(`User ${user._id} connected to relationship room ${relationshipRoom}`);

    socket.emit("authenticated", {
      userId: user._id,
      name: user.name,
      relationshipId: user.relationshipId,
    });

    // Register Handlers
    messageHandlers(io, socket);
    presenceHandlers(io, socket);
    callHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`User ${user._id} disconnected`);
    });
  });

  return io;
};
