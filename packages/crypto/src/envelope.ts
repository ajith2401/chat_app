// Version envelope shared by every encrypted object in the system.
// Versioning from day one lets us rotate algorithms without ambiguity.

export const ALG = "xchacha20poly1305" as const;
export type Alg = typeof ALG;

/** Current crypto object version. v:0 is reserved for legacy plaintext. */
export const CURRENT_V = 1;

export interface Envelope {
  v: number;
  alg: Alg;
}

/** AEAD-sealed payload: nonce + ciphertext, both base64. */
export interface Sealed extends Envelope {
  nonce: string;
  ct: string;
}

/** A private key wrapped by a password/recovery-derived key (Argon2id). */
export interface WrappedKey extends Envelope {
  salt: string;
  nonce: string;
  ct: string;
}

/** CK sealed to a recipient public key via crypto_box_seal (anonymous). */
export interface SealedBox extends Envelope {
  ct: string;
}

export function isLegacy(env?: { v?: number } | null): boolean {
  return !env || env.v === undefined || env.v === 0;
}
