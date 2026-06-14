import { describe, it, expect, beforeAll } from "vitest";
import {
  ready,
  genSymKey,
  genBoxKeypair,
  aeadEncrypt,
  aeadDecrypt,
  wrapPrivateKey,
  unwrapPrivateKey,
  genRecoverySecret,
  encodeRecoveryCode,
  decodeRecoveryCode,
  recoverySecretToPassword,
  genCK,
  exportCK,
  importCK,
  sealCK,
  openCK,
  encryptMessage,
  decryptMessage,
  encryptReaction,
  decryptReaction,
  encryptFile,
  decryptFile,
  wrapFileKey,
  unwrapFileKey,
  b64,
} from "../index";

beforeAll(async () => {
  await ready();
});

describe("AEAD", () => {
  it("round-trips plaintext", () => {
    const key = genSymKey();
    const sealed = aeadEncrypt(key, "hello love");
    expect(sealed.v).toBe(1);
    expect(sealed.alg).toBe("xchacha20poly1305");
    expect(aeadDecrypt(key, sealed)).toBe("hello love");
  });

  it("fails on wrong key", () => {
    const sealed = aeadEncrypt(genSymKey(), "secret");
    expect(() => aeadDecrypt(genSymKey(), sealed)).toThrow();
  });

  it("fails on tampered ciphertext", () => {
    const key = genSymKey();
    const sealed = aeadEncrypt(key, "secret");
    const bytes = Buffer.from(sealed.ct, "base64");
    bytes[0] ^= 0x01;
    expect(() => aeadDecrypt(key, { ...sealed, ct: bytes.toString("base64") })).toThrow();
  });
});

describe("Argon2id key wrapping", () => {
  it("wraps and unwraps with the correct password", () => {
    const priv = b64(genSymKey());
    const wrapped = wrapPrivateKey("hunter2-strong-passphrase", priv);
    expect(wrapped.salt).toBeTruthy();
    expect(unwrapPrivateKey("hunter2-strong-passphrase", wrapped)).toBe(priv);
  });

  it("rejects the wrong password", () => {
    const wrapped = wrapPrivateKey("right-password", b64(genSymKey()));
    expect(() => unwrapPrivateKey("wrong-password", wrapped)).toThrow();
  });
});

describe("Recovery code", () => {
  it("round-trips a secret through a grouped code", () => {
    const secret = genRecoverySecret();
    const code = encodeRecoveryCode(secret);
    expect(code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4})+$/);
    const decoded = decodeRecoveryCode(code);
    expect(Buffer.from(decoded)).toEqual(Buffer.from(secret));
  });

  it("is tolerant of lowercase and spacing", () => {
    const secret = genRecoverySecret();
    const code = encodeRecoveryCode(secret).toLowerCase().replace(/-/g, " ");
    expect(Buffer.from(decodeRecoveryCode(code))).toEqual(Buffer.from(secret));
  });

  it("rejects a corrupted code", () => {
    const code = encodeRecoveryCode(genRecoverySecret());
    const broken = code.slice(0, -1) + (code.endsWith("0") ? "1" : "0");
    expect(() => decodeRecoveryCode(broken)).toThrow();
  });

  it("recovery secret can wrap/unwrap the identity key", () => {
    const secret = genRecoverySecret();
    const pw = recoverySecretToPassword(secret);
    const priv = b64(genSymKey());
    const wrapped = wrapPrivateKey(pw, priv);
    const restored = recoverySecretToPassword(decodeRecoveryCode(encodeRecoveryCode(secret)));
    expect(unwrapPrivateKey(restored, wrapped)).toBe(priv);
  });
});

describe("Conversation key distribution", () => {
  it("seals CK to a device and opens it", () => {
    const ck = genCK();
    const device = genBoxKeypair();
    const box = sealCK(device.pub, ck);
    expect(box.ct).toBeTruthy();
    const opened = openCK(box, device.pub, device.priv);
    expect(b64(opened)).toBe(exportCK(ck));
  });

  it("a different device cannot open the sealed CK", () => {
    const ck = genCK();
    const device = genBoxKeypair();
    const attacker = genBoxKeypair();
    const box = sealCK(device.pub, ck);
    expect(() => openCK(box, attacker.pub, attacker.priv)).toThrow();
  });

  it("encrypts and decrypts a message under CK", () => {
    const ck = genCK();
    const sealed = encryptMessage(ck, "I miss you 💜");
    expect(decryptMessage(ck, sealed)).toBe("I miss you 💜");
  });

  it("import/export CK is stable", () => {
    const ck = genCK();
    const restored = importCK(exportCK(ck));
    const sealed = encryptMessage(ck, "stable");
    expect(decryptMessage(restored, sealed)).toBe("stable");
  });

  it("encrypts and decrypts reactions", () => {
    const ck = genCK();
    const sealed = encryptReaction(ck, "❤️");
    expect(decryptReaction(ck, sealed)).toBe("❤️");
  });
});

describe("Media encryption", () => {
  it("encrypts a file and decrypts it with the wrapped key", () => {
    const ck = genCK();
    const original = new Uint8Array([1, 2, 3, 4, 5, 250, 251, 252]);
    const { ciphertext, fileKey } = encryptFile(original);
    const wrapped = wrapFileKey(ck, fileKey);

    // Simulate round-trip: recipient unwraps the file key via CK, then decrypts.
    const recoveredKey = unwrapFileKey(ck, wrapped);
    const plaintext = decryptFile(ciphertext, recoveredKey);
    expect(Buffer.from(plaintext)).toEqual(Buffer.from(original));
  });

  it("a wrong CK cannot unwrap the file key", () => {
    const { fileKey } = encryptFile(new Uint8Array([9, 9, 9]));
    const wrapped = wrapFileKey(genCK(), fileKey);
    expect(() => unwrapFileKey(genCK(), wrapped)).toThrow();
  });
});
