import IORedis from "ioredis";
import { Message, MessageEmbedding, Relationship } from "@couple-chat/database";
import { generateEmbedding, analyzeEmotionalTone } from "../../api/src/domains/ai-memory/services/emotionEngine";

const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

const EMOTION_FREQUENCY = 5;

export const processMessageAI = async (jobData: any) => {
  const { messageId, relationshipId, content } = jobData;

  // 1. Generate and upsert embedding — idempotent on retry (unique index on messageId)
  const embedding = await generateEmbedding(content);
  if (embedding) {
    await MessageEmbedding.findOneAndUpdate(
      { messageId },
      { $setOnInsert: { messageId, relationshipId, embedding } },
      { upsert: true, new: false }
    );
  }

  // 2. Atomic Redis counter — O(1), race-condition-free (replaces countDocuments)
  const countKey = `msg_count:${relationshipId}`;
  const count = await redis.incr(countKey);

  if (count % EMOTION_FREQUENCY === 0) {
    const recentMessages = await Message.find({ relationshipId, type: "text", deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("content");

    const emotionResult = await analyzeEmotionalTone(recentMessages.map((m) => m.content));

    if (emotionResult?.dominantMood) {
      await Relationship.findByIdAndUpdate(relationshipId, {
        currentMood: emotionResult.dominantMood,
        lastEmotionIntensity: emotionResult.intensity ?? 0.5,
        lastEmotionSummary: emotionResult.emotionalSummary ?? "",
      });
      await redis.publish(
        "mood-updates",
        JSON.stringify({ relationshipId, mood: emotionResult.dominantMood, intensity: emotionResult.intensity ?? 0.5 })
      );
    }
  }
};
