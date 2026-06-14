import { Sealed } from "./envelope";
import {
  SymKey,
  genSymKey,
  aeadEncryptBytes,
  aeadDecryptBytes,
  b64,
  ub64,
} from "./primitives";

// Images are encrypted client-side with a fresh per-file key before upload.
// The per-file key is then wrapped under CK and stored on the message, so only
// the partners (and opted-in AI) can derive it. Cloudinary stores ciphertext bytes.

export interface EncryptedFile {
  ciphertext: Sealed;
  fileKey: SymKey;
}

export function encryptFile(bytes: Uint8Array): EncryptedFile {
  const fileKey = genSymKey();
  const ciphertext = aeadEncryptBytes(fileKey, bytes);
  return { ciphertext, fileKey };
}

export function decryptFile(ciphertext: Sealed, fileKey: SymKey): Uint8Array {
  return aeadDecryptBytes(fileKey, ciphertext);
}

/** Wrap the per-file key under CK (AEAD). Stored as message.mediaKey. */
export function wrapFileKey(ck: SymKey, fileKey: SymKey): Sealed {
  return aeadEncryptBytes(ck, fileKey);
}

export function unwrapFileKey(ck: SymKey, wrapped: Sealed): SymKey {
  return aeadDecryptBytes(ck, wrapped);
}

export { b64 as fileKeyToB64, ub64 as b64ToFileKey };
