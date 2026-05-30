import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const mainQueue = new Queue("main-queue", { connection });

export const addMediaJob = async (data: {
  relationshipId: string;
  userId: string;
  fileKey: string;
  type: string;
}) => {
  await mainQueue.add("process_media", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
};

export const addAIJob = async (data: {
  messageId: string;
  relationshipId: string;
  content: string;
}) => {
  await mainQueue.add("process_ai_message", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 100 },
  });
};
