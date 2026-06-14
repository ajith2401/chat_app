import {
  ready,
  openCK,
  decryptMessage,
  importCK,
  type SymKey,
  type SealedBox,
  type Sealed,
  isLegacy,
} from "@couple-chat/crypto";

// The server-side AI keypair. When a couple opts in, their CK is sealed to
// AI_PUBLIC_KEY; the worker holds AI_PRIVATE_KEY to unwrap it. Keep the private
// key in a secret store in production — it grants read access to opted-in chats.
const AI_PUBLIC_KEY = process.env.AI_PUBLIC_KEY || "";
const AI_PRIVATE_KEY = process.env.AI_PRIVATE_KEY || "";

let initialised = false;
export async function initAIKey() {
  if (!initialised) {
    await ready();
    initialised = true;
  }
}

export function aiKeyConfigured(): boolean {
  return Boolean(AI_PUBLIC_KEY && AI_PRIVATE_KEY);
}

/** Unwrap a relationship's Conversation Key from its AI grant blob. */
export function unwrapCKForAI(wrappedCKForAI: unknown): SymKey {
  return openCK(wrappedCKForAI as SealedBox, AI_PUBLIC_KEY, AI_PRIVATE_KEY);
}

/**
 * Decrypt a stored message body using CK. Legacy plaintext (enc absent/v:0)
 * is returned as-is so the AI pipeline keeps working across the migration.
 */
export function decryptStored(
  ck: SymKey,
  content: string,
  enc?: { v?: number; alg?: string; nonce?: string } | null
): string {
  if (isLegacy(enc) || !enc?.nonce) return content;
  const sealed: Sealed = { v: enc.v as number, alg: enc.alg as any, nonce: enc.nonce, ct: content };
  return decryptMessage(ck, sealed);
}

export { importCK };
