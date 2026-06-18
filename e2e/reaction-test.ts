// Verify encrypted reactions round-trip over the socket between two partners.
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";
import {
  ready, genBoxKeypair, genCK, sealCK, openCK, encryptMessage,
  encryptReaction, decryptReaction, wrapPrivateKey, type SealedBox,
} from "@couple-chat/crypto";

const API = "http://localhost:4005/api/v1";
const SOCKET = "http://localhost:4005";
let pass = 0, fail = 0;
const chk = (c: boolean, m: string) => { c ? (console.log("  ✓ " + m), pass++) : (console.log("  ✗ " + m), fail++); };
const cookie = (r: Response) => ((r.headers as any).getSetCookie?.() || []).map((c: string) => c.split(";")[0]).find((c: string) => c.startsWith("auth_token=")) || "";

async function signup(email: string, name: string) {
  const r = await fetch(`${API}/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password123", name }) });
  const b = await r.json(); const ck = cookie(r); return { cookie: ck, token: ck.split("=")[1], userId: b.user._id };
}
async function api(path: string, c: string, method = "GET", body?: any) {
  const r = await fetch(`${API}${path}`, { method, headers: { "Content-Type": "application/json", Cookie: c }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: r.status !== 204 ? await r.json().catch(() => ({})) : {} };
}

async function main() {
  await ready();
  const tag = Date.now();
  const A = await signup(`ra_${tag}@t.com`, "Aria"); const B = await signup(`rb_${tag}@t.com`, "Bo");
  const created = await api("/relationships/create", A.cookie, "POST");
  await api("/relationships/join", B.cookie, "POST", { inviteCode: created.json.inviteCode });

  const aId = genBoxKeypair(), bId = genBoxKeypair();
  await api("/keys/identity", A.cookie, "POST", { identityPub: aId.pub, wrappedIdPrivByPassword: wrapPrivateKey("password123", aId.priv), wrappedIdPrivByRecovery: wrapPrivateKey("r", aId.priv) });
  await api("/keys/identity", B.cookie, "POST", { identityPub: bId.pub, wrappedIdPrivByPassword: wrapPrivateKey("password123", bId.priv), wrappedIdPrivByRecovery: wrapPrivateKey("r", bId.priv) });
  const ck = genCK();
  await api("/keys/ck-shares", A.cookie, "POST", { shares: [{ deviceId: `identity:${B.userId}`, sealedCK: sealCK(bId.pub, ck) }] });
  const share = await api(`/keys/ck-shares?deviceId=identity:${B.userId}`, B.cookie);
  const bCK = openCK(share.json.sealedCK as SealedBox, bId.pub, bId.priv);

  const sockA = io(SOCKET, { transports: ["websocket"], auth: { token: A.token } });
  const sockB = io(SOCKET, { transports: ["websocket"], auth: { token: B.token } });
  const wait = (s: any) => new Promise<void>((r) => s.connected ? r() : s.on("connect", () => r()));

  // B captures the reaction broadcast.
  const gotReaction = new Promise<any>((res, rej) => {
    const t = setTimeout(() => rej(new Error("no message_reactions")), 8000);
    sockB.on("message_reactions", (d: any) => { clearTimeout(t); res(d); });
  });
  // capture the saved message id from B's receive_message
  const gotMsg = new Promise<any>((res) => sockB.on("receive_message", (m: any) => res(m)));

  await wait(sockB); await wait(sockA);
  const cgid = randomUUID();
  const sealed = encryptMessage(ck, "i love you");
  sockA.emit("send_message", { clientGeneratedId: cgid, content: sealed.ct, type: "text", enc: { v: sealed.v, alg: sealed.alg, nonce: sealed.nonce } });
  const msg = await gotMsg;
  chk(!!msg._id, "message delivered to B");

  // A reacts with an encrypted ❤️
  const emojiEnc = encryptReaction(ck, "❤️");
  sockA.emit("react_message", { messageId: msg._id, emojiEnc });
  const rx = await gotReaction;
  chk(rx.messageId === msg._id, "B got reaction broadcast for the message");
  chk(rx.reactions.length === 1, "exactly one reaction stored");
  const decrypted = decryptReaction(bCK, rx.reactions[0].emojiEnc);
  chk(decrypted === "❤️", "B decrypted the reaction emoji = ❤️");

  // A changes reaction to 🔥 (still one reaction per user)
  const rx2 = await new Promise<any>((res) => {
    sockB.on("message_reactions", (d: any) => {
      if (d.reactions[0] && decryptReaction(bCK, d.reactions[0].emojiEnc) === "🔥") res(d);
    });
    sockA.emit("react_message", { messageId: msg._id, emojiEnc: encryptReaction(ck, "🔥") });
  });
  chk(rx2.reactions.length === 1, "changing reaction replaces, not duplicates");

  sockA.close(); sockB.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
