// Browser-side E2EE engine. Holds the Conversation Key (CK) in memory and
// exposes synchronous encrypt/decrypt so the zustand store, socket hook, and
// React components can all use it without prop-drilling.
//
// Key coordination (deterministic, no central trust):
//  - Identity keypair: recoverable root. idPriv is unwrapped from the server's
//    opaque blob using the password or recovery code.
//  - Device keypair: per-browser, persisted in localStorage. Enables fast unlock
//    (open CK with device key, no password) and future revocation.
//  - CK is sealed to BOTH the identity key and each device key, so recovery on a
//    fresh device works (unwrap idPriv -> open the identity CK share).
//  - The relationship CREATOR (user1) mints CK and seals it to the partner's
//    identity + devices when they appear. user2 waits for that share.

import {
  ready,
  genBoxKeypair,
  genCK,
  exportCK,
  importCK,
  sealCK,
  openCK,
  encryptMessage,
  decryptMessage,
  encryptFile,
  decryptFile,
  wrapFileKey,
  unwrapFileKey,
  wrapPrivateKey,
  unwrapPrivateKey,
  genRecoverySecret,
  encodeRecoveryCode,
  decodeRecoveryCode,
  recoverySecretToPassword,
  isLegacy,
  b64,
  ub64,
  type SymKey,
  type BoxKeypair,
  type Sealed,
  type SealedBox,
  type WrappedKey,
} from "@couple-chat/crypto";
import api from "./api";

interface StoredDevice {
  deviceId: string;
  devicePub: string;
  devicePriv: string;
}

let ck: SymKey | null = null;
let idKeypair: BoxKeypair | null = null;
let device: StoredDevice | null = null;
let initialised = false;

const DEVICE_KEY = (userId: string) => `cc_device_${userId}`;
const IDENTITY_SHARE_ID = (userId: string) => `identity:${userId}`;

function loadDevice(userId: string): StoredDevice | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY(userId));
    return raw ? (JSON.parse(raw) as StoredDevice) : null;
  } catch {
    return null;
  }
}

function saveDevice(userId: string, d: StoredDevice) {
  localStorage.setItem(DEVICE_KEY(userId), JSON.stringify(d));
}

function newDeviceId(): string {
  return b64(genRecoverySecret()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
}

async function init() {
  if (!initialised) {
    await ready();
    initialised = true;
  }
}

/** Ensure this browser has a registered device keypair. */
async function ensureDevice(userId: string): Promise<StoredDevice> {
  if (device) return device;
  let d = loadDevice(userId);
  if (!d) {
    const kp = genBoxKeypair();
    d = { deviceId: newDeviceId(), devicePub: kp.pub, devicePriv: kp.priv };
    saveDevice(userId, d);
  }
  device = d;
  await api.post("/keys/device", { deviceId: d.deviceId, devicePub: d.devicePub }).catch(() => {});
  return d;
}

export interface SignupResult {
  recoveryCode: string;
}

/**
 * First-time setup at signup: generate identity keys, wrap the private key under
 * the password AND a fresh recovery code, publish public material, and return the
 * recovery code to show the user once.
 */
export async function setupNewIdentity(userId: string, password: string): Promise<SignupResult> {
  await init();
  const kp = genBoxKeypair();
  idKeypair = kp;

  const recoverySecret = genRecoverySecret();
  const recoveryCode = encodeRecoveryCode(recoverySecret);

  const wrappedIdPrivByPassword = wrapPrivateKey(password, kp.priv) as unknown as Record<string, unknown>;
  const wrappedIdPrivByRecovery = wrapPrivateKey(
    recoverySecretToPassword(recoverySecret),
    kp.priv
  ) as unknown as Record<string, unknown>;

  await api.post("/keys/identity", {
    identityPub: kp.pub,
    wrappedIdPrivByPassword,
    wrappedIdPrivByRecovery,
  });

  await ensureDevice(userId);
  return { recoveryCode };
}

/** Unwrap idPriv using the login password. Throws on wrong password. */
export async function unlockWithPassword(userId: string, password: string): Promise<void> {
  await init();
  const { data } = await api.get("/keys/identity");
  if (!data?.identityPub || !data?.wrappedIdPrivByPassword) {
    throw new Error("No identity keys found for this account");
  }
  const priv = unwrapPrivateKey(password, data.wrappedIdPrivByPassword as WrappedKey);
  idKeypair = { pub: data.identityPub, priv };
  await ensureDevice(userId);
}

/** Unwrap idPriv using the recovery code (fresh device / forgotten password). */
export async function unlockWithRecoveryCode(userId: string, recoveryCode: string): Promise<void> {
  await init();
  const { data } = await api.get("/keys/identity");
  if (!data?.identityPub || !data?.wrappedIdPrivByRecovery) {
    throw new Error("No identity keys found for this account");
  }
  const secret = decodeRecoveryCode(recoveryCode);
  const priv = unwrapPrivateKey(recoverySecretToPassword(secret), data.wrappedIdPrivByRecovery as WrappedKey);
  idKeypair = { pub: data.identityPub, priv };
  await ensureDevice(userId);
}

async function fetchDeviceShare(deviceId: string): Promise<SealedBox | null> {
  try {
    const { data } = await api.get(`/keys/ck-shares`, { params: { deviceId } });
    return (data?.sealedCK as SealedBox) ?? null;
  } catch {
    return null;
  }
}

async function postShares(shares: Array<{ deviceId: string; sealedCK: unknown }>) {
  if (shares.length === 0) return;
  await api.post("/keys/ck-shares", { shares }).catch(() => {});
}

/**
 * Make CK available for this relationship, minting/distributing it as needed.
 * isCreator => this user is relationship.user1Id (the only one allowed to mint).
 * Returns true if CK is now available, false if still waiting on the creator.
 */
export async function ensureCK(userId: string, isCreator: boolean): Promise<boolean> {
  await init();
  const d = await ensureDevice(userId);

  // 1. Fast path: CK already sealed to this device.
  const deviceShare = await fetchDeviceShare(d.deviceId);
  if (deviceShare) {
    ck = openCK(deviceShare, d.devicePub, d.devicePriv);
    await distributeIfCreator(userId, isCreator);
    return true;
  }

  // 2. Recovery path: CK sealed to our identity (needs unlocked idPriv).
  if (idKeypair) {
    const idShare = await fetchDeviceShare(IDENTITY_SHARE_ID(userId));
    if (idShare) {
      ck = openCK(idShare, idKeypair.pub, idKeypair.priv);
      // Seal to this device for future fast unlocks.
      await postShares([{ deviceId: d.deviceId, sealedCK: sealCK(d.devicePub, ck) }]);
      await distributeIfCreator(userId, isCreator);
      return true;
    }
  }

  // 3. Mint path: only the creator may mint a brand-new CK.
  if (isCreator && idKeypair) {
    ck = genCK();
    await postShares([
      { deviceId: IDENTITY_SHARE_ID(userId), sealedCK: sealCK(idKeypair.pub, ck) },
      { deviceId: d.deviceId, sealedCK: sealCK(d.devicePub, ck) },
    ]);
    await distributeIfCreator(userId, isCreator);
    return true;
  }

  // 4. user2 on a fresh setup: CK not distributed yet. Wait.
  return false;
}

/** Creator seals CK to the partner's identity + devices that lack a share. */
async function distributeIfCreator(userId: string, isCreator: boolean) {
  if (!isCreator || !ck) return;
  let bundle: any;
  try {
    ({ data: bundle } = await api.get("/keys/bundle"));
  } catch {
    return;
  }
  const partner = bundle?.partner;
  if (!partner?.identityPub) return;

  const shares: Array<{ deviceId: string; sealedCK: unknown }> = [];
  // Seal to partner identity (so they can recover on any device). Addressed by
  // the partner's userId, which is the same id the partner uses to fetch it.
  if (partner.userId) {
    shares.push({
      deviceId: IDENTITY_SHARE_ID(partner.userId),
      sealedCK: sealCK(partner.identityPub, ck),
    });
  }
  for (const dev of partner.devices || []) {
    shares.push({ deviceId: dev.deviceId, sealedCK: sealCK(dev.devicePub, ck) });
  }
  await postShares(shares);
}

export function hasCK(): boolean {
  return ck !== null;
}

export function isUnlocked(): boolean {
  return idKeypair !== null;
}

export function lock() {
  ck = null;
  idKeypair = null;
}

// --- Message + media crypto (synchronous; require CK) ---

export function encryptOutgoing(plaintext: string): { content: string; enc: Sealed } {
  if (!ck) throw new Error("CK not available");
  const sealed = encryptMessage(ck, plaintext);
  // content carries ciphertext; enc carries the envelope (nonce lives in both shapes).
  return { content: sealed.ct, enc: sealed };
}

export function decryptIncoming(message: { content: string; enc?: { v?: number; alg?: string; nonce?: string } | null }): string {
  if (isLegacy(message.enc) || !message.enc?.nonce) return message.content; // legacy plaintext
  if (!ck) return "🔒";
  try {
    const sealed: Sealed = {
      v: message.enc.v as number,
      alg: message.enc.alg as any,
      nonce: message.enc.nonce,
      ct: message.content,
    };
    return decryptMessage(ck, sealed);
  } catch {
    return "🔒";
  }
}

export async function encryptImage(bytes: Uint8Array): Promise<{ ciphertext: Uint8Array; mediaKey: Record<string, unknown> }> {
  if (!ck) throw new Error("CK not available");
  const { ciphertext, fileKey } = encryptFile(bytes);
  const wrappedKey = wrapFileKey(ck, fileKey);
  // Pack the sealed envelope (nonce+ct) into a single byte blob to upload.
  const payload = new TextEncoder().encode(JSON.stringify(ciphertext));
  return { ciphertext: payload, mediaKey: wrappedKey as unknown as Record<string, unknown> };
}

export function decryptImageBlob(payload: Uint8Array, mediaKey: Record<string, unknown>): Uint8Array {
  if (!ck) throw new Error("CK not available");
  const sealed = JSON.parse(new TextDecoder().decode(payload)) as Sealed;
  const fileKey = unwrapFileKey(ck, mediaKey as unknown as Sealed);
  return decryptFile(sealed, fileKey);
}

/** Seal CK to the server AI public key for the opt-in AI bridge. */
export function sealCKForAI(aiPublicKey: string): Record<string, unknown> {
  if (!ck) throw new Error("CK not available");
  return sealCK(aiPublicKey, ck) as unknown as Record<string, unknown>;
}

export { b64, ub64, importCK, exportCK };
