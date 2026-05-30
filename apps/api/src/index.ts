import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

// Validate required env vars before anything else boots
import "./config/env";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { createServer } from "http";
import { connectDB } from "./config/db";
import { initSocket } from "./socket";
import { initEventHandlers } from "./lib/eventHandlers";
import authRoutes from "./domains/auth/routes/authRoutes";
import relationshipRoutes from "./domains/relationships/routes/relationshipRoutes";
import messageRoutes from "./domains/messaging/routes/messageRoutes";
import mediaRoutes from "./domains/media/routes/mediaRoutes";
import memoryRoutes from "./domains/ai-memory/routes/memoryRoutes";
import journalRoutes from "./domains/journals/routes/journalRoutes";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 4000;

app.set("trust proxy", 1); // correct IP behind reverse proxy (for rate limiter)

// Connect to Database
connectDB();

// Initialize Socket Layer
const io = initSocket(httpServer);

// Initialize Event Handlers
initEventHandlers(io);

app.use(helmet({ contentSecurityPolicy: false })); // CSP handled at Next.js layer
app.use(cors({
  origin: (process.env.CLIENT_URL || "http://localhost:3000").split(",").map(s => s.trim()),
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/v1/auth/", authLimiter);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/relationships", relationshipRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/memories", memoryRoutes);
app.use("/api/v1/journals", journalRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Centralized error handler — never leak internal details
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const id = Math.random().toString(36).slice(2, 10);
  logger.error({ err, id }, "Unhandled error");
  const status = err.status || err.statusCode || 500;
  const message = err.isAppError ? err.message : "An unexpected error occurred";
  res.status(status).json({ message, id });
});

httpServer.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
