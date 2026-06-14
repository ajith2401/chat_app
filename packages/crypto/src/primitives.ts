import _sodium from "libsodium-wrappers-sumo";
import { Sealed, SealedBox, CURRENT_V, ALG } from "./envelope";

// libsodium must be initialised (WASM) before any call. `ready()` is idempotent.
let sodium: typeof _sodium;
export async function ready(): Promise<typeof _sodium> {
  await _sodium.ready;
  sodium = _sodium;
  return sodium;
}

export const b64 = (u: Uint8Array): string => Buffer.from(u).toString("base64");
export const ub64 = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "base64"));

export type SymKey = Uint8Array;
export interface BoxKeypair {
  pub: string;
  priv: string;
}

export function genSymKey(): SymKey {
  return sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
}

export function genBoxKeypair(): BoxKeypair {
  const kp = sodium.crypto_box_keypair();
  return { pub: b64(kp.publicKey), priv: b64(kp.privateKey) };
}

// --- AEAD (XChaCha20-Poly1305) over raw bytes ---

export function aeadEncryptBytes(key: SymKey, plaintext: Uint8Array, aad = ""): Sealed {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    aad ? sodium.from_string(aad) : null,
    null,
    nonce,
    key
  );
  return { v: CURRENT_V, alg: ALG, nonce: b64(nonce), ct: b64(ct) };
}

export function aeadDecryptBytes(key: SymKey, sealed: Sealed, aad = ""): Uint8Array {
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ub64(sealed.ct),
    aad ? sodium.from_string(aad) : null,
    ub64(sealed.nonce),
    key
  );
}

// --- AEAD over UTF-8 strings (convenience) ---

export function aeadEncrypt(key: SymKey, plaintext: string, aad = ""): Sealed {
  return aeadEncryptBytes(key, sodium.from_string(plaintext), aad);
}

export function aeadDecrypt(key: SymKey, sealed: Sealed, aad = ""): string {
  return sodium.to_string(aeadDecryptBytes(key, sealed, aad));
}

// --- Anonymous sealed box (CK distribution to a device/AI public key) ---

export function sealTo(recipientPubB64: string, message: Uint8Array): SealedBox {
  const ct = sodium.crypto_box_seal(message, ub64(recipientPubB64));
  return { v: CURRENT_V, alg: ALG, ct: b64(ct) };
}

export function sealOpen(box: SealedBox, pubB64: string, privB64: string): Uint8Array {
  return sodium.crypto_box_seal_open(ub64(box.ct), ub64(pubB64), ub64(privB64));
}

export function getSodium(): typeof _sodium {
  return sodium;
}
