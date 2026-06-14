import mongoose, { Schema, Document } from "mongoose";

export interface ICKShare {
  deviceId: string;
  sealedCK: Record<string, unknown>;
}

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
  // --- E2EE: Conversation Key sealed to each active device ---
  ckShares: ICKShare[];
  // --- Opt-in AI grant lifecycle. wrappedCKForAI present <=> AI may read future messages. ---
  wrappedCKForAI?: Record<string, unknown>;
  aiGrantVersion: number;
  aiGrantedAt?: Date;
  aiRevokedAt?: Date;
  createdAt: Date;
}

const CKShareSchema = new Schema<ICKShare>(
  {
    deviceId: { type: String, required: true },
    sealedCK: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

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
  ckShares: { type: [CKShareSchema], default: [] },
  wrappedCKForAI: { type: Schema.Types.Mixed },
  aiGrantVersion: { type: Number, default: 0 },
  aiGrantedAt: { type: Date },
  aiRevokedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IRelationship>("Relationship", RelationshipSchema);
