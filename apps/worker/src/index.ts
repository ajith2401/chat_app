import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import { connectDB } from "@couple-chat/database";
import { processMedia } from "./processors/mediaProcessor";
import { processMessageAI } from "./processors/aiProcessor";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

connectDB().then(() => logger.info("Worker connected to MongoDB"))
  .catch((err) => { logger.error("Worker MongoDB connection error:", err); process.exit(1); });

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "main-queue",
  async (job) => {
    logger.info(`Processing job ${job.id} of type ${job.name}`);
    if (job.name === "process_media") {
      await processMedia(job.data);
    } else if (job.name === "process_ai_message") {
      await processMessageAI(job.data);
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 20, duration: 60_000 },
  }
);

worker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

logger.info("Worker started");
