import IORedis from "ioredis";
import { Message, MessageEmbedding, Relationship } from "@couple-chat/database";
import { generateEmbedding, analyzeEmotionalTone } from "../../../api/src/domains/ai-memory/services/emotionEngine";
import { initAIKey, aiKeyConfigured, unwrapCKForAI, decryptStored } from "../lib/aiKey";

const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

const EMOTION_FREQUENCY = 5;

export const processMessageAI = async (jobData: any) => {
  const { messageId, relationshipId } = jobData;

  // The producer only enqueues when the couple opted in, but re-check here:
  // the grant could have been revoked between enqueue and processing.
  const rel = await Relationship.findById(relationshipId).select("wrappedCKForAI");
  if (!rel?.wrappedCKForAI) return; // AI access not granted (or revoked) — do nothing.
  if (!aiKeyConfigured()) return; // server AI key not configured — fail closed.

  await initAIKey();
  const ck = unwrapCKForAI(rel.wrappedCKForAI);

  // 1. Load + decrypt this message, then embed it.
  const msg = await Message.findById(messageId).select("content enc");
  if (!msg) return;
  const plaintext = decryptStored(ck, msg.content, msg.enc as any);

  const embedding = await generateEmbedding(plaintext);
  if (embedding) {
    await MessageEmbedding.findOneAndUpdate(
      { messageId },
      { $setOnInsert: { messageId, relationshipId, embedding } },
      { upsert: true, new: false }
    );
  }

  // 2. Atomic Redis counter — O(1), race-condition-free.
  const countKey = `msg_count:${relationshipId}`;
  const count = await redis.incr(countKey);

  if (count % EMOTION_FREQUENCY === 0) {
    const recentMessages = await Message.find({ relationshipId, type: "text", deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("content enc");

    const decrypted = recentMessages.map((m) => {
      try {
        return decryptStored(ck, m.content, m.enc as any);
      } catch {
        return ""; // skip anything we can't decrypt rather than abort the batch
      }
    }).filter((t) => t.length > 0);

    const emotionResult = await analyzeEmotionalTone(decrypted);

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
