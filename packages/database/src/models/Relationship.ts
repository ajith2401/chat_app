import mongoose, { Schema, Document } from "mongoose";

export interface IRelationship extends Document {
  user1Id: mongoose.Types.ObjectId;
  user2Id?: mongoose.Types.ObjectId;
  status: "pending" | "active";
  anniversaryDate?: Date;
  themePreferences: {
    featureFlags: string[];
  };
  currentMood: string;
  lastEmotionIntensity?: number;
  lastEmotionSummary?: string;
  createdAt: Date;
}

const RelationshipSchema: Schema = new Schema({
  user1Id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  user2Id: { type: Schema.Types.ObjectId, ref: "User" },
  inviteCode: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ["pending", "active"], default: "pending" },
  anniversaryDate: { type: Date },
  themePreferences: {
    featureFlags: { type: [String], default: [] },
  },
  currentMood: { type: String, default: "neutral" },
  lastEmotionIntensity: { type: Number },
  lastEmotionSummary: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IRelationship>("Relationship", RelationshipSchema);
