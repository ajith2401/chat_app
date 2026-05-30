import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  relationshipId?: mongoose.Types.ObjectId;
  presenceStatus: string;
  deviceTokens: string[];
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  relationshipId: { type: Schema.Types.ObjectId, ref: "Relationship" },
  presenceStatus: { type: String, default: "offline" },
  deviceTokens: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>("User", UserSchema);
