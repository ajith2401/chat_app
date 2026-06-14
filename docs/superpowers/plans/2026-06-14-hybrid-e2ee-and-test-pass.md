# Hybrid E2EE + Full Test Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hybrid end-to-end encryption (zero-knowledge by default, opt-in AI) to the couple-chat app, then run a full test pass (crypto units, API integration, security, Playwright E2E, live run).

**Architecture:** A new pure `@couple-chat/crypto` package wraps libsodium (X25519 sealed-box + XChaCha20-Poly1305 + Argon2id). Clients hold all key material; the server stores only ciphertext + public keys. Messages/images/reactions are encrypted under a per-relationship Conversation Key (CK), itself sealed per-device. AI features work only when a couple explicitly seals CK to a server AI key. Every crypto object is versioned.

**Tech Stack:** libsodium-wrappers, TypeScript, Mongoose, Zod, Next.js, Socket.io, Vitest (web/crypto), Jest+supertest (api), Playwright (e2e).

Reference spec: `docs/superpowers/specs/2026-06-14-hybrid-e2ee-and-test-pass-design.md`

---

## File Structure

**New package `packages/crypto`:**
- `src/envelope.ts` — version envelope types + guards (`v`, `alg`)
- `src/primitives.ts` — libsodium init, keygen, AEAD encrypt/decrypt, sealed box
- `src/kdf.ts` — Argon2id wrap/unwrap of private keys
- `src/recoveryCode.ts` — 256-bit secret ↔ grouped Crockford-base32 code
- `src/conversation.ts` — CK generation, seal-to-device, message/reaction encrypt/decrypt
- `src/media.ts` — per-file key, encrypt/decrypt bytes, wrap file key under CK
- `src/index.ts` — public exports
- `src/__tests__/*.test.ts` — Vitest units

**Modified packages/database models:** `User.ts`, `Relationship.ts`, `Message.ts` (fields per spec §3.1).

**Modified packages/validation:** `index.ts` — message schema accepts ciphertext + `enc` envelope + `mediaKey`/`reactions`.

**Modified apps/api:** `domains/keys/*` (new), `domains/auth/*` (store/return key blobs), `socket/handlers/messageHandlers.ts` (persist enc fields, gate AI job), `domains/relationships/*` (AI grant enable/disable).

**Modified apps/web:** `contexts/CryptoContext.tsx` (new), `lib/crypto-client.ts` (new browser glue), `app/signup`, `app/login`, `app/settings`, `app/chat/page.tsx`, `components/ChatBubble.tsx`, `store/useChatStore.ts`.

**Modified apps/worker:** `processors/aiProcessor.ts` (CK unwrap gate).

**Tests:** `packages/crypto/src/__tests__`, `apps/api/__tests__` (Jest+supertest), `e2e/` (Playwright at repo root).

---

## Stage 0: Crypto package scaffold

### Task 0.1: Create the package

**Files:**
- Create: `packages/crypto/package.json`
- Create: `packages/crypto/tsconfig.json`
- Create: `packages/crypto/vitest.config.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@couple-chat/crypto",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": { "libsodium-wrappers": "^0.7.13" },
  "devDependencies": {
    "@types/libsodium-wrappers": "^0.7.14",
    "vitest": "^4.1.7",
    "typescript": "^5.4.5"
  },
  "scripts": { "test": "vitest run" }
}
```

- [ ] **Step 2: vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { globals: true, environment: "node" } });
```

- [ ] **Step 3: tsconfig.json** — mirror `packages/database/tsconfig.json` (or `{ "compilerOptions": { "target": "ES2020", "module": "commonjs", "esModuleInterop": true, "strict": true, "skipLibCheck": true } }`).

- [ ] **Step 4:** `npm install` at repo root to link the workspace. Expected: `@couple-chat/crypto` linked.

- [ ] **Step 5: Commit** `chore(crypto): scaffold @couple-chat/crypto package`

---

## Stage 1: Crypto primitives (TDD)

All crypto functions are pure and async (libsodium needs `await sodium.ready`). Envelope shape:

```ts
// envelope.ts
export const ALG = "xchacha20poly1305" as const;
export interface Envelope { v: number; alg: typeof ALG; }
export interface Sealed extends Envelope { nonce: string; ct: string; }      // base64
export interface WrappedKey extends Envelope { salt: string; nonce: string; ct: string; }
export const CURRENT_V = 1;
```

### Task 1.1: AEAD round-trip

**Files:** Create `packages/crypto/src/primitives.ts`, `packages/crypto/src/envelope.ts`, test `packages/crypto/src/__tests__/primitives.test.ts`

- [ ] **Step 1: failing test**

```ts
import { describe, it, expect } from "vitest";
import { ready, genSymKey, aeadEncrypt, aeadDecrypt } from "../primitives";

describe("aead", () => {
  it("round-trips plaintext", async () => {
    await ready();
    const key = genSymKey();
    const sealed = aeadEncrypt(key, "hello love");
    expect(sealed.v).toBe(1);
    expect(aeadDecrypt(key, sealed)).toBe("hello love");
  });
  it("fails on wrong key", async () => {
    await ready();
    const sealed = aeadEncrypt(genSymKey(), "secret");
    expect(() => aeadDecrypt(genSymKey(), sealed)).toThrow();
  });
  it("fails on tampered ciphertext", async () => {
    await ready();
    const key = genSymKey();
    const sealed = aeadEncrypt(key, "secret");
    const bytes = Buffer.from(sealed.ct, "base64"); bytes[0] ^= 0x01;
    expect(() => aeadDecrypt(key, { ...sealed, ct: bytes.toString("base64") })).toThrow();
  });
});
```

- [ ] **Step 2: run, expect FAIL** — `cd packages/crypto && npx vitest run` → module not found.

- [ ] **Step 3: implement primitives.ts**

```ts
import _sodium from "libsodium-wrappers";
import { Sealed, CURRENT_V, ALG } from "./envelope";

let sodium: typeof _sodium;
export async function ready() { await _sodium.ready; sodium = _sodium; return sodium; }
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const ub64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));

export type SymKey = Uint8Array;
export function genSymKey(): SymKey { return sodium.crypto_aead_xchacha20poly1305_ietf_keygen(); }

export function aeadEncrypt(key: SymKey, plaintext: string, aad = ""): Sealed {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    sodium.from_string(plaintext), aad ? sodium.from_string(aad) : null, null, nonce, key);
  return { v: CURRENT_V, alg: ALG, nonce: b64(nonce), ct: b64(ct) };
}

export function aeadDecrypt(key: SymKey, sealed: Sealed, aad = ""): string {
  const pt = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, ub64(sealed.ct), aad ? sodium.from_string(aad) : null, ub64(sealed.nonce), key);
  return sodium.to_string(pt);
}

export function genBoxKeypair() { const kp = sodium.crypto_box_keypair(); return { pub: b64(kp.publicKey), priv: b64(kp.privateKey) }; }
export function seal(recipientPubB64: string, message: Uint8Array): string { return b64(sodium.crypto_box_seal(message, ub64(recipientPubB64))); }
export function sealOpen(pubB64: string, privB64: string, ctB64: string): Uint8Array {
  return sodium.crypto_box_seal_open(ub64(ctB64), ub64(pubB64), ub64(privB64));
}
export { b64, ub64 };
```

- [ ] **Step 4: run, expect PASS.**
- [ ] **Step 5: Commit** `feat(crypto): AEAD primitives + sealed box (TDD)`

### Task 1.2: Argon2id key wrapping (`kdf.ts`)

- [ ] **Step 1: failing test** (`__tests__/kdf.test.ts`): derive wrap key from password+salt, wrap a private key, unwrap with correct password succeeds, wrong password throws.

```ts
import { ready } from "../primitives";
import { wrapPrivateKey, unwrapPrivateKey } from "../kdf";
it("wraps and unwraps with password", async () => {
  await ready();
  const priv = "cHJpdmF0ZS1rZXktYnl0ZXM=";
  const wrapped = wrapPrivateKey("hunter2-strongpw", priv);
  expect(unwrapPrivateKey("hunter2-strongpw", wrapped)).toBe(priv);
  expect(() => unwrapPrivateKey("wrong", wrapped)).toThrow();
});
```

- [ ] **Step 2: run FAIL. Step 3: implement** `kdf.ts`:

```ts
import _sodium from "libsodium-wrappers";
import { WrappedKey, CURRENT_V, ALG } from "./envelope";
import { b64, ub64 } from "./primitives";
const s = () => _sodium;
function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  return s().crypto_pwhash(s().crypto_aead_xchacha20poly1305_ietf_KEYBYTES, password, salt,
    s().crypto_pwhash_OPSLIMIT_MODERATE, s().crypto_pwhash_MEMLIMIT_MODERATE, s().crypto_pwhash_ALG_ARGON2ID13);
}
export function wrapPrivateKey(password: string, privB64: string): WrappedKey {
  const salt = s().randombytes_buf(s().crypto_pwhash_SALTBYTES);
  const key = deriveKey(password, salt);
  const nonce = s().randombytes_buf(s().crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = s().crypto_aead_xchacha20poly1305_ietf_encrypt(ub64(privB64), null, null, nonce, key);
  return { v: CURRENT_V, alg: ALG, salt: b64(salt), nonce: b64(nonce), ct: b64(ct) };
}
export function unwrapPrivateKey(password: string, w: WrappedKey): string {
  const key = deriveKey(password, ub64(w.salt));
  const pt = s().crypto_aead_xchacha20poly1305_ietf_decrypt(null, ub64(w.ct), null, ub64(w.nonce), key);
  return b64(pt);
}
```

- [ ] **Step 4: PASS. Step 5: Commit** `feat(crypto): Argon2id private-key wrapping`

### Task 1.3: Recovery code (`recoveryCode.ts`)

- [ ] **Step 1: failing test**: `genRecoverySecret()` → 32 bytes; `encodeRecoveryCode(secret)` → grouped `XXXX-XXXX-...`; `decodeRecoveryCode(code)` round-trips; bad checksum throws.
- [ ] **Step 3: implement** Crockford base32 encode of 32 random bytes, groups of 4 chars joined by `-`, last group = 4-char checksum (first 20 bits of `crypto_generichash`). Provide `recoverySecretToPassword(secret)` returning a base64 string usable as the password input to `wrapPrivateKey` (so recovery reuses the same wrap path).
- [ ] **Step 5: Commit** `feat(crypto): recovery code encode/decode`

### Task 1.4: Conversation + media (`conversation.ts`, `media.ts`)

- [ ] **Step 1: failing tests**:
  - `genCK()`, `sealCKToDevice(devicePub, ck)` → opaque; `openCK(devicePub, devicePriv, sealed)` returns same CK.
  - `encryptMessage(ck, text)`/`decryptMessage(ck, sealed)` round-trip.
  - `encryptReaction(ck, "❤️")`/`decryptReaction` round-trip.
  - `encryptFile(bytes)` → `{ ciphertext, fileKey }`; `wrapFileKey(ck, fileKey)`/`unwrapFileKey(ck, wrapped)`; `decryptFile(ciphertext, fileKey)` returns original bytes.
- [ ] **Step 3: implement** using primitives (CK is a SymKey; seal CK bytes via `seal`/`sealOpen`; file key is its own SymKey, bytes encrypted with `aeadEncrypt`-style raw-bytes variant).
- [ ] **Step 5: Commit** `feat(crypto): conversation + media encryption`

### Task 1.5: Public exports + full suite

- [ ] `src/index.ts` re-exports all public functions/types.
- [ ] Run `cd packages/crypto && npx vitest run` → all green.
- [ ] **Commit** `feat(crypto): public API surface`

---

## Stage 2: Database + validation schema

### Task 2.1: Extend models

**Files:** Modify `packages/database/src/models/{User,Relationship,Message}.ts`

- [ ] Add to `User`: `identityPub?: string`, `wrappedIdPrivByPassword?: object`, `wrappedIdPrivByRecovery?: object`, `devices: [{ deviceId, devicePub, lastSeen, revokedAt }]` (all optional → backward compatible).
- [ ] Add to `Relationship`: `ckShares: [{ deviceId, sealedCK }]`, `wrappedCKForAI?: object`, `aiGrantVersion: { type: Number, default: 0 }`, `aiGrantedAt?: Date`, `aiRevokedAt?: Date`.
- [ ] Add to `Message`: `enc?: { v: Number, alg: String, nonce: String }`, `mediaKey?: object`, change `reactions` to `{ userId, emoji?: String, emojiEnc?: object }` (keep `emoji` optional for legacy).
- [ ] Use `{ type: Schema.Types.Mixed }` for the wrapped-key blobs.
- [ ] **Commit** `feat(db): add E2EE key + ciphertext fields (backward compatible)`

### Task 2.2: Validation schema

**Files:** Modify `packages/validation/src/index.ts`

- [ ] Extend `sendMessageSchema`: add optional `enc: z.object({ v: z.number(), alg: z.string(), nonce: z.string() }).optional()`, `mediaKey: z.any().optional()`, `reactionsEnc` not needed here. Relax the text-non-empty refine to allow ciphertext (`content` is now base64, never empty for real text; keep `min` guard).
- [ ] Add `keysPublishSchema`, `deviceRegisterSchema`, `ckShareSchema`, `aiGrantSchema`.
- [ ] **Commit** `feat(validation): schemas for encrypted messages + key endpoints`

---

## Stage 3: API key management + message persistence

### Task 3.1: `/keys` domain

**Files:** Create `apps/api/src/domains/keys/{controllers,routes,services}/*`; wire in `apps/api/src/index.ts`.

- [ ] Endpoints (all auth-guarded):
  - `POST /keys/identity` — store `identityPub`, `wrappedIdPrivByPassword`, `wrappedIdPrivByRecovery` (signup).
  - `GET /keys/identity` — return current user's wrapped privs + pub (login restore).
  - `POST /keys/device` — register `{ deviceId, devicePub }`.
  - `GET /keys/bundle` — return partner's `identityPub` + own/partner device pubs for CK sealing.
  - `POST /keys/ck-shares` — store `ckShares` on the relationship.
  - `GET /keys/ck-shares?deviceId=` — return sealed CK for a device.
  - `POST /keys/ai-grant` / `DELETE /keys/ai-grant` — enable/disable (`wrappedCKForAI`, lifecycle fields).
- [ ] Reuse `authMiddleware` + `relationshipGuard`. Service functions are thin Mongoose updates.
- [ ] **Commit** `feat(api): key management endpoints`

### Task 3.2: Auth returns key blobs

- [ ] Modify `authController`/`authService` login + `/me` to include `identityPub` and whether wrapped privs exist (so the client knows to prompt unlock vs first-time setup). Do not return privs from login automatically beyond `/keys/identity`.
- [ ] **Commit** `feat(api): expose key presence on auth responses`

### Task 3.3: Message handler persists enc + gates AI

**Files:** Modify `apps/api/src/socket/handlers/messageHandlers.ts`

- [ ] Persist `enc` and `mediaKey` from the payload onto the `Message`.
- [ ] Only `addAIJob(...)` when the relationship has `wrappedCKForAI` (look up once, cache on socket.user). Pass `relationshipId` + `messageId` only — worker fetches ciphertext + CK itself.
- [ ] **Commit** `feat(api): store ciphertext envelope, gate AI on opt-in`

---

## Stage 4: Worker AI bridge

### Task 4.1: CK-unwrap gate

**Files:** Modify `apps/worker/src/processors/aiProcessor.ts`; add `apps/worker/src/lib/aiKey.ts` (loads `AI_PRIVATE_KEY` from env).

- [ ] Worker job now receives `{ messageId, relationshipId }`. Load relationship; if no `wrappedCKForAI`, return early.
- [ ] Unwrap CK with `aiPriv` (sealed-open), load message, decrypt `content` with CK, then run existing embedding/emotion logic. Emotion batch also decrypts each recent message.
- [ ] Add `AI_PUBLIC_KEY` / `AI_PRIVATE_KEY` to `.env.example`.
- [ ] **Commit** `feat(worker): decrypt via opt-in AI grant`

---

## Stage 5: Web client encryption

### Task 5.1: Browser crypto context

**Files:** Create `apps/web/contexts/CryptoContext.tsx`, `apps/web/lib/crypto-client.ts`.

- [ ] `crypto-client.ts` wraps `@couple-chat/crypto` for the browser, persists `devicePriv` + `deviceId` in IndexedDB, holds CK + `idPriv` in memory.
- [ ] `CryptoContext` exposes `unlock(password)`, `restore(recoveryCode)`, `ck`, `encryptOutgoing`, `decryptIncoming`, `ready`.
- [ ] On login: call `/keys/identity`, unwrap `idPriv` with password, register device, fetch CK share (or seal CK from partner bundle on first device).
- [ ] **Commit** `feat(web): CryptoContext + browser key management`

### Task 5.2: Signup key generation + recovery screen

- [ ] On signup success: generate identity keypair, wrap priv (password + recovery), `POST /keys/identity`, generate + display recovery code once (confirm-saved gate), generate CK, register first device, store `ckShares`.
- [ ] **Commit** `feat(web): signup key setup + recovery code screen`

### Task 5.3: Encrypt on send / decrypt on render

**Files:** Modify `apps/web/app/chat/page.tsx`, `store/useChatStore.ts`, `components/ChatBubble.tsx`.

- [ ] `handleSend`: encrypt text with CK → send `{ content: ct, enc }`. Optimistic message keeps plaintext locally for instant render.
- [ ] Store/`ChatBubble`: when a message has `enc.v >= 1`, decrypt with CK before display; `enc.v === 0`/absent → render plaintext (legacy).
- [ ] **Commit** `feat(web): encrypt outgoing + decrypt incoming messages`

### Task 5.4: Encrypted images

- [ ] `handleFileUpload`: encrypt bytes → upload ciphertext to Cloudinary `raw` upload → store `mediaKey` (wrapped file key) on message.
- [ ] `ChatBubble`: fetch ciphertext, unwrap file key, decrypt to blob URL.
- [ ] **Commit** `feat(web): encrypted image upload + display`

### Task 5.5: AI opt-in consent UI

**Files:** Modify `apps/web/app/settings/page.tsx`.

- [ ] Dedicated consent screen explaining the trade-off; enable → seal CK to `aiPub`, `POST /keys/ai-grant`; disable → `DELETE /keys/ai-grant` with the "previous insights remain" copy.
- [ ] **Commit** `feat(web): explicit AI opt-in consent`

---

## Stage 6: Full test pass

### Task 6.1: API integration tests (Jest + supertest + mongodb-memory-server)

**Files:** Create `apps/api/__tests__/{auth,relationships,messages,keys,security}.test.ts`, `apps/api/jest.config.js`.

- [ ] Spin ephemeral Mongo; test auth happy/again paths, relationship create/join, message send/list, `/keys` round-trip, **authz isolation** (user A cannot read B's relationship), JWT expiry/tamper rejected, NoSQL-injection payloads rejected by Zod.
- [ ] **Commit** `test(api): integration + security suite`

### Task 6.2: Playwright E2E

**Files:** Create `e2e/playwright.config.ts`, `e2e/tests/*.spec.ts`, root `package.json` script `test:e2e`.

- [ ] Dual browser contexts (two partners): signup+recovery, login unlock, send/receive encrypted text live, encrypted image, AI opt-in effect, session-expiry redirect.
- [ ] **Commit** `test(e2e): Playwright dual-partner flows`

### Task 6.3: Security audit doc + plaintext-leak assertion

**Files:** Create `docs/superpowers/security-audit-2026-06-14.md`.

- [ ] Automated check: after sending messages with AI off, query Mongo directly and assert `content` is not human-readable plaintext for `enc.v>=1` docs.
- [ ] Document findings across JWT, IDOR, injection, Cloudinary signature, crypto invariants, headers/rate-limit.
- [ ] **Commit** `docs: security audit report`

### Task 6.4: Live run

- [ ] `docker-compose up` (Mongo+Redis), start api+worker+web, run `crypto` + `api` + `e2e` suites, capture real output into the audit doc. Report pass/fail honestly.

---

## Self-Review Notes

- **Spec coverage:** all 6 review items map to tasks — recovery code (1.3), device keys (2.1/3.1/5.1), versioning (envelope in 1.1), AI lifecycle (3.1/4.1/5.5), forward-secrecy doc (6.3 + spec §8), reaction/metadata enc (1.4/2.1/5.3).
- **Backward compat:** all new DB fields optional; legacy `enc.v:0` render path preserved.
- **Types consistent:** envelope shapes defined once in `envelope.ts`, reused everywhere.
