import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  relationshipId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  clientGeneratedId: string;
  content: string;
  type: "text" | "image" | "voice" | "video" | "future-capsule";
  mediaUrl?: string;
  status: {
    sentAt: Date;
    deliveredAt?: Date;
    seenAt?: Date;
  };
  reactions: Array<{
    userId: mongoose.Types.ObjectId;
    emoji: string;
  }>;
  unlockDate?: Date;
  deletedAt?: Date;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  relationshipId: { type: Schema.Types.ObjectId, ref: "Relationship", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  clientGeneratedId: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
  type: {
    type: String,
    enum: ["text", "image", "voice", "video", "future-capsule"],
    default: "text",
  },
  mediaUrl: { type: String },
  status: {
    sentAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
    seenAt: { type: Date },
  },
  reactions: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      emoji: { type: String },
    },
  ],
  unlockDate: { type: Date },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Partial index covering the soft-delete filter — skips deleted docs in the index
MessageSchema.index(
  { relationshipId: 1, createdAt: -1 },
  { partialFilterExpression: { deletedAt: { $exists: false } } }
);
// Compound index for the AI processor text query
MessageSchema.index({ relationshipId: 1, type: 1, createdAt: -1 });
MessageSchema.index({ relationshipId: 1, "status.seenAt": 1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
// clientGeneratedId uniqueness is already enforced by the schema field definition above

export default mongoose.model<IMessage>("Message", MessageSchema);
