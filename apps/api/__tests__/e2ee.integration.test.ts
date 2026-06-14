import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { Message, User, Relationship } from "@couple-chat/database";
import {
  ready,
  genBoxKeypair,
  genCK,
  exportCK,
  sealCK,
  openCK,
  encryptMessage,
  decryptMessage,
} from "@couple-chat/crypto";
import * as keysService from "../src/domains/keys/services/keysService";

const MONGO_URL =
  process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/couple-chat-e2ee-test";

beforeAll(async () => {
  await ready();
  await mongoose.connect(MONGO_URL);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Relationship.deleteMany({}),
    Message.deleteMany({}),
  ]);
});

describe("E2EE message persistence invariant", () => {
  it("stores only ciphertext in MongoDB — no plaintext leak", async () => {
    const ck = genCK();
    const rel = await Relationship.create({ user1Id: new mongoose.Types.ObjectId(), status: "active" });
    const sender = new mongoose.Types.ObjectId();
    const PLAINTEXT = "meet me at our usual place at 8 — secret 💜";

    const sealed = encryptMessage(ck, PLAINTEXT);
    await Message.create({
      relationshipId: rel._id,
      senderId: sender,
      clientGeneratedId: "cgid-1",
      content: sealed.ct,
      type: "text",
      enc: { v: sealed.v, alg: sealed.alg, nonce: sealed.nonce },
    });

    // Read the RAW stored document straight from the collection.
    const raw: any = await mongoose.connection
      .collection("messages")
      .findOne({ clientGeneratedId: "cgid-1" });

    // The plaintext must appear nowhere in the persisted record.
    const serialized = JSON.stringify(raw);
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("usual place");
    expect(raw.content).toBe(sealed.ct);
    expect(raw.enc.v).toBe(1);

    // And the partner can still recover the exact plaintext with CK.
    const recovered = decryptMessage(ck, {
      v: raw.enc.v,
      alg: raw.enc.alg,
      nonce: raw.enc.nonce,
      ct: raw.content,
    });
    expect(recovered).toBe(PLAINTEXT);
  });

  it("a different CK cannot decrypt stored ciphertext", async () => {
    const ck = genCK();
    const sealed = encryptMessage(ck, "private");
    expect(() =>
      decryptMessage(genCK(), { v: sealed.v, alg: sealed.alg, nonce: sealed.nonce, ct: sealed.ct })
    ).toThrow();
  });
});

describe("keysService — identity + device lifecycle", () => {
  it("publishes identity and never exposes a derivable private key", async () => {
    const user = await User.create({ email: "a@x.com", passwordHash: "h", name: "A" });
    await keysService.publishIdentity(user._id.toString(), {
      identityPub: "PUBKEY",
      wrappedIdPrivByPassword: { v: 1, alg: "xchacha20poly1305", salt: "s", nonce: "n", ct: "opaque1" },
      wrappedIdPrivByRecovery: { v: 1, alg: "xchacha20poly1305", salt: "s2", nonce: "n2", ct: "opaque2" },
    });

    const fetched = await keysService.getIdentity(user._id.toString());
    expect(fetched?.identityPub).toBe("PUBKEY");
    // Wrapped blobs are opaque ciphertext — server cannot derive the real key.
    expect((fetched as any)?.wrappedIdPrivByPassword.ct).toBe("opaque1");
  });

  it("registers devices idempotently (upsert by deviceId)", async () => {
    const user = await User.create({ email: "b@x.com", passwordHash: "h", name: "B" });
    await keysService.registerDevice(user._id.toString(), { deviceId: "dev-aaaaaaaa", devicePub: "P1" });
    await keysService.registerDevice(user._id.toString(), { deviceId: "dev-aaaaaaaa", devicePub: "P2" });
    const devices = await keysService.registerDevice(user._id.toString(), { deviceId: "dev-bbbbbbbb", devicePub: "P3" });

    expect(devices).toHaveLength(2);
    expect(devices.find((d) => d.deviceId === "dev-aaaaaaaa")?.devicePub).toBe("P2");
  });
});

describe("keysService — CK distribution + bundle authz", () => {
  it("merges CK shares and returns the right share per device", async () => {
    const rel = await Relationship.create({ user1Id: new mongoose.Types.ObjectId(), status: "active" });
    await keysService.setCKShares(rel._id.toString(), [
      { deviceId: "dev-1", sealedCK: { v: 1, ct: "x" } },
      { deviceId: "dev-2", sealedCK: { v: 1, ct: "y" } },
    ]);
    // Re-seal dev-1 (merge, not duplicate) and add identity share.
    await keysService.setCKShares(rel._id.toString(), [
      { deviceId: "dev-1", sealedCK: { v: 1, ct: "x2" } },
    ]);

    const share = await keysService.getCKShare(rel._id.toString(), "dev-1");
    expect((share as any).ct).toBe("x2");
    const fresh = await Relationship.findById(rel._id).select("ckShares");
    expect(fresh?.ckShares).toHaveLength(2);
  });

  it("key bundle returns the partner's public keys but never wrapped privs", async () => {
    const u1 = await User.create({ email: "u1@x.com", passwordHash: "h", name: "U1", identityPub: "PUB1",
      wrappedIdPrivByPassword: { ct: "secret-blob" }, devices: [{ deviceId: "d1", devicePub: "DPUB1" }] });
    const u2 = await User.create({ email: "u2@x.com", passwordHash: "h", name: "U2", identityPub: "PUB2",
      wrappedIdPrivByPassword: { ct: "secret-blob2" }, devices: [{ deviceId: "d2", devicePub: "DPUB2" }] });
    const rel = await Relationship.create({ user1Id: u1._id, user2Id: u2._id, status: "active" });

    const bundle = await keysService.getKeyBundle(rel._id.toString(), u1._id.toString());
    expect(bundle.partner?.identityPub).toBe("PUB2");
    expect(bundle.partner?.userId).toBe(u2._id.toString());
    expect(bundle.partner?.devices[0].devicePub).toBe("DPUB2");
    // The bundle must NOT carry any wrapped private key material.
    expect(JSON.stringify(bundle)).not.toContain("secret-blob");
  });

  it("a full creator->partner CK seal round-trips through the DB", async () => {
    // user1 mints CK, seals to user2 identity; user2 opens it with idPriv.
    const u2id = genBoxKeypair();
    const u1 = await User.create({ email: "c1@x.com", passwordHash: "h", name: "C1", identityPub: "PUB1" });
    const u2 = await User.create({ email: "c2@x.com", passwordHash: "h", name: "C2", identityPub: u2id.pub });
    const rel = await Relationship.create({ user1Id: u1._id, user2Id: u2._id, status: "active" });

    const ck = genCK();
    await keysService.setCKShares(rel._id.toString(), [
      { deviceId: `identity:${u2._id.toString()}`, sealedCK: sealCK(u2id.pub, ck) as any },
    ]);

    const share = await keysService.getCKShare(rel._id.toString(), `identity:${u2._id.toString()}`);
    const opened = openCK(share as any, u2id.pub, u2id.priv);
    expect(exportCK(opened)).toBe(exportCK(ck));
  });
});

describe("AI grant lifecycle", () => {
  it("enable sets grant fields + flag; disable clears key + sets revoked", async () => {
    const rel = await Relationship.create({ user1Id: new mongoose.Types.ObjectId(), status: "active" });

    const enabled = await keysService.enableAIGrant(rel._id.toString(), { v: 1, ct: "ck-for-ai" });
    expect(enabled?.aiGrantVersion).toBe(1);
    expect(enabled?.aiGrantedAt).toBeTruthy();
    expect(enabled?.themePreferences.featureFlags).toContain("ai-insights");
    const afterEnable = await Relationship.findById(rel._id).select("wrappedCKForAI");
    expect(afterEnable?.wrappedCKForAI).toBeTruthy();

    const disabled = await keysService.disableAIGrant(rel._id.toString());
    expect(disabled?.aiRevokedAt).toBeTruthy();
    expect(disabled?.themePreferences.featureFlags).not.toContain("ai-insights");
    const afterDisable = await Relationship.findById(rel._id).select("wrappedCKForAI");
    expect(afterDisable?.wrappedCKForAI).toBeFalsy();
  });
});
