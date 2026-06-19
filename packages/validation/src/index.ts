import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

// --- E2EE envelope shapes (mirror @couple-chat/crypto) ---
export const encEnvelopeSchema = z.object({
  v: z.number().int(),
  alg: z.string().max(64),
  nonce: z.string().max(128),
});

// A generic sealed/wrapped blob: keep it permissive but bounded.
export const sealedBlobSchema = z.record(z.string(), z.any());

export const sendMessageSchema = z.object({
  clientGeneratedId: z.string().uuid(),
  // content is base64 ciphertext when enc is present; cap raised for AEAD overhead.
  content: z.string().max(8000),
  type: z.enum(["text", "image", "voice", "video", "future-capsule"]).default("text"),
  mediaUrl: z.string().max(500).optional(),
  replyTo: z.string().optional(),
  enc: encEnvelopeSchema.optional(),
  mediaKey: sealedBlobSchema.optional(),
}).refine(
  (d) => d.type !== "text" || d.content.trim().length > 0,
  { message: "Text messages cannot be empty", path: ["content"] }
);

// --- Key management endpoint schemas ---
export const publishIdentitySchema = z.object({
  identityPub: z.string().min(1).max(256),
  wrappedIdPrivByPassword: sealedBlobSchema,
  wrappedIdPrivByRecovery: sealedBlobSchema,
});

export const registerDeviceSchema = z.object({
  deviceId: z.string().min(8).max(128),
  devicePub: z.string().min(1).max(256),
});

export const ckSharesSchema = z.object({
  shares: z.array(
    z.object({
      deviceId: z.string().min(8).max(128),
      sealedCK: sealedBlobSchema,
    })
  ).min(1).max(20),
});

export const aiGrantSchema = z.object({
  wrappedCKForAI: sealedBlobSchema,
});

export const messageSeenSchema = z.object({
  messageId: z.string().min(1),
});

export const moodSchema = z.object({
  mood: z.enum(["neutral", "romantic", "happy", "tense", "missing_you", "supportive", "playful"]),
});

export const journalCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  type: z.enum(["journal", "milestone"]).default("journal"),
  moodTag: z.string().max(40).optional(),
});

export const batchSeenSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(100),
});

export const reactMessageSchema = z.object({
  messageId: z.string().min(1),
  emojiEnc: z.record(z.string(), z.any()),
});

export const unreactMessageSchema = z.object({
  messageId: z.string().min(1),
});

export const presenceStatusSchema = z.object({
  status: z.enum(["online", "offline", "away", "busy"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessageSeenInput = z.infer<typeof messageSeenSchema>;
