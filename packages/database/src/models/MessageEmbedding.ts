import mongoose, { Schema, Document } from "mongoose";

export interface IMessageEmbedding extends Document {
  messageId: mongoose.Types.ObjectId;
  relationshipId: mongoose.Types.ObjectId;
  embedding: number[];
  createdAt: Date;
}

const MessageEmbeddingSchema: Schema = new Schema({
  messageId: { type: Schema.Types.ObjectId, ref: "Message", required: true },
  relationshipId: { type: Schema.Types.ObjectId, ref: "Relationship", required: true },
  embedding: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now },
});

MessageEmbeddingSchema.index({ messageId: 1 }, { unique: true }); // idempotency on retry
MessageEmbeddingSchema.index({ relationshipId: 1 }); // vector search scope

export default mongoose.model<IMessageEmbedding>("MessageEmbedding", MessageEmbeddingSchema);
