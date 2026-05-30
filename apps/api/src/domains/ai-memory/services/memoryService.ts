import { MessageEmbedding, Message } from "@couple-chat/database";
import { generateEmbedding } from "./emotionEngine";

export const semanticSearch = async (relationshipId: string, query: string, limit: number = 10) => {
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) return [];

  // MongoDB Atlas Vector Search aggregation
  // This requires a defined vector index in Atlas
  const results = await MessageEmbedding.aggregate([
    {
      $vectorSearch: {
        index: "default", // index name in Atlas
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: limit,
        filter: { relationshipId: { $eq: relationshipId } },
      },
    },
    {
      $lookup: {
        from: "messages",
        localField: "messageId",
        foreignField: "_id",
        as: "message",
      },
    },
    { $unwind: "$message" },
    {
      $project: {
        _id: 0,
        message: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results;
};
