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

export const sendMessageSchema = z.object({
  clientGeneratedId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  type: z.enum(["text", "image", "voice", "video", "future-capsule"]).default("text"),
  mediaUrl: z.string().regex(/^(https:\/\/res\.cloudinary\.com\/|[a-z0-9_/-]+$)/).optional(),
  replyTo: z.string().optional(),
});

export const messageSeenSchema = z.object({
  messageId: z.string().min(1),
});

export const moodSchema = z.object({
  mood: z.enum(["neutral", "romantic", "happy", "tense", "missing_you", "supportive", "playful"]),
});

export const batchSeenSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(100),
});

export const presenceStatusSchema = z.object({
  status: z.enum(["online", "offline", "away", "busy"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessageSeenInput = z.infer<typeof messageSeenSchema>;
