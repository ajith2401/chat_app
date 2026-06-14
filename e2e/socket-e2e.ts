// True end-to-end test: two partners, real HTTP + Socket.io, real crypto.
// A encrypts a message under CK; it travels over the socket; B decrypts it;
// the DB is checked to contain only ciphertext.
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import {
  ready,
  genBoxKeypair,
  genCK,
  exportCK,
  sealCK,
  openCK,
  encryptMessage,
  decryptMessage,
  wrapPrivateKey,
  unwrapPrivateKey,
  type SealedBox,
} from "@couple-chat/crypto";

const API = "http://localhost:4005/api/v1";
const SOCKET = "http://localhost:4005";
const MONGO = "mongodb://127.0.0.1:27017/couple-chat-livetest";

let pass = 0, fail = 0;
const chk = (cond: boolean, msg: string) => {
  if (cond) { console.log(`  ✓ ${msg}`); pass++; }
  else { console.log(`  ✗ ${msg}`); fail++; }
};

function cookieFrom(res: Response): string {
  const sc = (res.headers as any).getSetCookie?.() || [];
  const tok = sc.map((c: string) => c.split(";")[0]).find((c: string) => c.startsWith("auth_token="));
  return tok || "";
}

async function signup(email: string, name: string) {
  const res = await fetch(`${API}/auth/signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123", name }),
  });
  const body = await res.json();
  return { cookie: cookieFrom(res), userId: body.user._id, token: cookieFrom(res).split("=")[1] };
}

async function api(path: string, cookie: string, method = "GET", body?: any) {
  const res = await fetch(`${API}${path}`, {
    method, headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: res.status !== 204 ? await res.json().catch(() => ({})) : {} };
}

async function main() {
  await ready();
  console.log("== Relationship setup ==");
  const A = await signup(`a_${Date.now()}@t.com`, "Aurora");
  const B = await signup(`b_${Date.now()}@t.com`, "Blake");
  chk(!!A.userId && !!B.userId, "both users created");

  const created = await api("/relationships/create", A.cookie, "POST");
  const inviteCode = created.json.inviteCode;
  chk(created.status === 200 || created.status === 201, "A created relationship");
  const joined = await api("/relationships/join", B.cookie, "POST", { inviteCode });
  chk(joined.status === 200 || joined.status === 201, "B joined relationship");

  // Refresh tokens/cookies so the JWT carries the now-active relationship.
  // (auth_token doesn't embed relationshipId, so the existing cookie still works.)

  console.log("== Key setup (real crypto) ==");
  const aId = genBoxKeypair(), bId = genBoxKeypair();
  const aDevice = genBoxKeypair(), bDevice = genBoxKeypair();
  const aDeviceId = "deviceA-" + Date.now(), bDeviceId = "deviceB-" + Date.now();

  // Publish identities (wrap a dummy priv with the password for realism).
  await api("/keys/identity", A.cookie, "POST", {
    identityPub: aId.pub,
    wrappedIdPrivByPassword: wrapPrivateKey("password123", aId.priv),
    wrappedIdPrivByRecovery: wrapPrivateKey("recover", aId.priv),
  });
  await api("/keys/identity", B.cookie, "POST", {
    identityPub: bId.pub,
    wrappedIdPrivByPassword: wrapPrivateKey("password123", bId.priv),
    wrappedIdPrivByRecovery: wrapPrivateKey("recover", bId.priv),
  });
  await api("/keys/device", A.cookie, "POST", { deviceId: aDeviceId, devicePub: aDevice.pub });
  await api("/keys/device", B.cookie, "POST", { deviceId: bDeviceId, devicePub: bDevice.pub });

  // A is creator: mint CK, seal to self + partner identity/devices.
  const ck = genCK();
  const bundle = await api("/keys/bundle", A.cookie);
  chk(bundle.json.partner?.identityPub === bId.pub, "A sees B's identity pubkey via bundle");
  await api("/keys/ck-shares", A.cookie, "POST", {
    shares: [
      { deviceId: `identity:${A.userId}`, sealedCK: sealCK(aId.pub, ck) },
      { deviceId: aDeviceId, sealedCK: sealCK(aDevice.pub, ck) },
      { deviceId: `identity:${B.userId}`, sealedCK: sealCK(bId.pub, ck) },
      { deviceId: bDeviceId, sealedCK: sealCK(bDevice.pub, ck) },
    ],
  });

  // B independently recovers CK from its identity share (simulates B's client).
  const bShare = await api(`/keys/ck-shares?deviceId=identity:${B.userId}`, B.cookie);
  const bCK = openCK(bShare.json.sealedCK as SealedBox, bId.pub, bId.priv);
  chk(exportCK(bCK) === exportCK(ck), "B recovered the SAME CK as A (key agreement works)");

  console.log("== Live encrypted message over Socket.io ==");
  const PLAINTEXT = "you are my favourite person, always 💜";
  const sealed = encryptMessage(ck, PLAINTEXT);

  const sockA = io(SOCKET, { transports: ["websocket"], auth: { token: A.token } });
  const sockB = io(SOCKET, { transports: ["websocket"], auth: { token: B.token } });
  sockA.on("connect_error", (e) => console.log("  ! sockA connect_error:", e.message));
  sockB.on("connect_error", (e) => console.log("  ! sockB connect_error:", e.message));

  const received: Promise<any> = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout waiting for receive_message")), 8000);
    sockB.on("receive_message", (m: any) => { clearTimeout(t); resolve(m); });
  });

  const waitConnect = (s: any) =>
    new Promise<void>((res) => { if (s.connected) return res(); s.on("connect", () => res()); });
  await waitConnect(sockB);
  await waitConnect(sockA);

  const cgid = randomUUID();
  await new Promise<void>((res) =>
    sockA.emit(
      "send_message",
      {
        clientGeneratedId: cgid,
        content: sealed.ct,
        type: "text",
        enc: { v: sealed.v, alg: sealed.alg, nonce: sealed.nonce },
      },
      (ack: any) => { if (ack?.error) console.log("  ! send ack error:", ack.error); res(); }
    )
  );

  const msg = await received;
  chk(msg.content === sealed.ct, "B received CIPHERTEXT over the wire (not plaintext)");
  chk(msg.content !== PLAINTEXT, "wire payload is NOT the plaintext");
  const decrypted = decryptMessage(bCK, { v: msg.enc.v, alg: msg.enc.alg, nonce: msg.enc.nonce, ct: msg.content });
  chk(decrypted === PLAINTEXT, "B decrypted the message to the exact plaintext");

  console.log("== Database plaintext-leak check ==");
  await mongoose.connect(MONGO);
  const raw: any = await mongoose.connection.collection("messages").findOne({ clientGeneratedId: cgid });
  chk(!!raw, "message persisted");
  chk(!JSON.stringify(raw).includes("favourite person"), "DB row contains NO plaintext");
  chk(raw.content === sealed.ct, "DB stored the ciphertext");
  await mongoose.disconnect();

  sockA.close(); sockB.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("E2E ERROR:", e); process.exit(1); });
