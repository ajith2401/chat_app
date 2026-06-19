import mongoose, { Schema, Document } from "mongoose";

export interface IDevice {
  deviceId: string;
  devicePub: string;
  lastSeen?: Date;
  revokedAt?: Date;
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  relationshipId?: mongoose.Types.ObjectId;
  presenceStatus: string;
  deviceTokens: string[];
  // --- E2EE identity key material: server stores only the public key and
  // opaque Argon2id-wrapped private-key blobs. It can never derive idPriv. ---
  identityPub?: string;
  wrappedIdPrivByPassword?: Record<string, unknown>;
  wrappedIdPrivByRecovery?: Record<string, unknown>;
  devices: IDevice[];
  // --- Email verification + password reset (tokens stored hashed) ---
  emailVerified: boolean;
  emailVerifyToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  // Bumped on password reset to invalidate all previously-issued JWTs.
  tokenVersion: number;
  // --- Web Push subscriptions (one per browser/device that opted in) ---
  pushSubscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>;
  createdAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: { type: String, required: true },
    devicePub: { type: String, required: true },
    lastSeen: { type: Date, default: Date.now },
    revokedAt: { type: Date },
  },
  { _id: false }
);

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  relationshipId: { type: Schema.Types.ObjectId, ref: "Relationship" },
  presenceStatus: { type: String, default: "offline" },
  deviceTokens: [{ type: String }],
  identityPub: { type: String },
  wrappedIdPrivByPassword: { type: Schema.Types.Mixed },
  wrappedIdPrivByRecovery: { type: Schema.Types.Mixed },
  devices: { type: [DeviceSchema], default: [] },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  tokenVersion: { type: Number, default: 0 },
  pushSubscriptions: { type: [Schema.Types.Mixed], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>("User", UserSchema);
