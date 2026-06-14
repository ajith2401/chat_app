import { WrappedKey, CURRENT_V, ALG } from "./envelope";
import { b64, ub64, getSodium } from "./primitives";

// Derive a symmetric wrapping key from a password (or recovery-derived password)
// using Argon2id. Used to wrap the identity private key for server storage.
function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  const s = getSodium();
  return s.crypto_pwhash(
    s.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
    password,
    salt,
    s.crypto_pwhash_OPSLIMIT_MODERATE,
    s.crypto_pwhash_MEMLIMIT_MODERATE,
    s.crypto_pwhash_ALG_ARGON2ID13
  );
}

/** Encrypt a base64 private key under a password. Returns an opaque, server-storable blob. */
export function wrapPrivateKey(password: string, privB64: string): WrappedKey {
  const s = getSodium();
  const salt = s.randombytes_buf(s.crypto_pwhash_SALTBYTES);
  const key = deriveKey(password, salt);
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(ub64(privB64), null, null, nonce, key);
  return { v: CURRENT_V, alg: ALG, salt: b64(salt), nonce: b64(nonce), ct: b64(ct) };
}

/** Recover the base64 private key. Throws if the password is wrong (AEAD auth failure). */
export function unwrapPrivateKey(password: string, w: WrappedKey): string {
  const s = getSodium();
  const key = deriveKey(password, ub64(w.salt));
  const pt = s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ub64(w.ct), null, ub64(w.nonce), key);
  return b64(pt);
}
