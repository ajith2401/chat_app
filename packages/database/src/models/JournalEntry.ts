import mongoose, { Schema, Document } from "mongoose";

export interface IJournalEntry extends Document {
  relationshipId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type: "journal" | "milestone";
  moodTag?: string;
  mediaUrls: string[];
  date: Date;
  deletedAt?: Date;
  createdAt: Date;
}

const JournalEntrySchema: Schema = new Schema({
  relationshipId: { type: Schema.Types.ObjectId, ref: "Relationship", required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ["journal", "milestone"], default: "journal" },
  moodTag: { type: String },
  mediaUrls: [{ type: String }],
  date: { type: Date, default: Date.now },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Index for relationship scoping
JournalEntrySchema.index({ relationshipId: 1, date: -1 });

export default mongoose.model<IJournalEntry>("JournalEntry", JournalEntrySchema);
