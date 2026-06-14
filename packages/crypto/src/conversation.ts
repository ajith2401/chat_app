import { Sealed, SealedBox } from "./envelope";
import {
  SymKey,
  genSymKey,
  aeadEncrypt,
  aeadDecrypt,
  sealTo,
  sealOpen,
  b64,
  ub64,
} from "./primitives";

// The Conversation Key (CK) is one symmetric key per relationship. It encrypts
// message bodies and reactions, and is distributed by sealing it to each device
// public key (and, when AI is opted in, to the server AI public key).

export function genCK(): SymKey {
  return genSymKey();
}

export function exportCK(ck: SymKey): string {
  return b64(ck);
}

export function importCK(ckB64: string): SymKey {
  return ub64(ckB64);
}

/** Seal CK to a recipient (device or AI) public key. Server stores the opaque box. */
export function sealCK(recipientPubB64: string, ck: SymKey): SealedBox {
  return sealTo(recipientPubB64, ck);
}

/** Open a sealed CK with the recipient's keypair. */
export function openCK(box: SealedBox, pubB64: string, privB64: string): SymKey {
  return sealOpen(box, pubB64, privB64);
}

export function encryptMessage(ck: SymKey, plaintext: string): Sealed {
  return aeadEncrypt(ck, plaintext);
}

export function decryptMessage(ck: SymKey, sealed: Sealed): string {
  return aeadDecrypt(ck, sealed);
}

export function encryptReaction(ck: SymKey, emoji: string): Sealed {
  return aeadEncrypt(ck, emoji);
}

export function decryptReaction(ck: SymKey, sealed: Sealed): string {
  return aeadDecrypt(ck, sealed);
}
