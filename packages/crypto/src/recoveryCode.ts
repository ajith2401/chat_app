import { b64, getSodium } from "./primitives";

// A generic 256-bit recovery secret encoded as a grouped Crockford base32 code.
// Deliberately NOT BIP39 — this is account recovery, not a crypto-wallet seed.
// The secret's only job is to derive a wrapping key for the identity private key.

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford (no I, L, O, U)
const SECRET_BYTES = 32;

function toBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function fromBase32(str: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of str) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid recovery code character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out.slice(0, SECRET_BYTES));
}

function checksum(secret: Uint8Array): string {
  const s = getSodium();
  const hash = s.crypto_generichash(4, secret); // 4 bytes -> first 4 base32 chars
  return toBase32(hash).slice(0, 4);
}

function group(code: string): string {
  return (code.match(/.{1,4}/g) || []).join("-");
}

/** 256-bit CSPRNG recovery secret. */
export function genRecoverySecret(): Uint8Array {
  return getSodium().randombytes_buf(SECRET_BYTES);
}

/** Encode the secret as a human-friendly grouped code with a trailing checksum group. */
export function encodeRecoveryCode(secret: Uint8Array): string {
  const body = toBase32(secret);
  return group(body) + "-" + checksum(secret);
}

/** Decode + verify a recovery code back to the raw secret. Throws on bad checksum. */
export function decodeRecoveryCode(code: string): Uint8Array {
  const clean = code.toUpperCase().replace(/[^0-9A-Z]/g, "");
  // Body is everything except the last 4 checksum chars.
  const body = clean.slice(0, clean.length - 4);
  const check = clean.slice(clean.length - 4);
  const secret = fromBase32(body);
  if (checksum(secret) !== check) throw new Error("Recovery code checksum mismatch");
  return secret;
}

/** Turn the recovery secret into a password string usable with wrapPrivateKey/unwrapPrivateKey. */
export function recoverySecretToPassword(secret: Uint8Array): string {
  return b64(secret);
}
