# Security Audit & Test Report — Hybrid E2EE

**Date:** 2026-06-14
**Scope:** End-to-end encryption implementation + existing API/auth surface.
**Method:** Automated tests against live MongoDB + Redis + the real API server, plus a two-partner Socket.io end-to-end run. All results below are from actual executed runs, not assertions.

---

## 1. Test results summary (all executed)

| Suite | What it proves | Result |
| --- | --- | --- |
| Crypto units (`packages/crypto`, Vitest) | AEAD round-trip, wrong-key + tamper rejection, Argon2id vault, recovery code, CK seal/open, media | **16/16 pass** |
| API integration (`apps/api/__tests__`, live Mongo) | Plaintext-leak invariant, keys lifecycle, device upsert, CK-share merge, bundle authz, AI grant lifecycle | **8/8 pass** |
| HTTP live (real API server) | Signup/login, duplicate/wrong-password rejection, 401 on no-auth + tampered JWT, keys round-trip, relationshipGuard 403 | **10/10 pass** |
| Socket E2E (two partners, real stack) | Relationship setup, real key agreement, encrypted delivery over Socket.io, partner decryption, DB ciphertext-only | **11/11 pass** |
| Web unit (`apps/web`, chatStore) | Store logic | **2/2 pass** |
| Web production build | Type-check + bundle of all 11 routes incl. libsodium | **passes** |

**Total: 47 automated checks passing.**

---

## 2. The core E2EE invariant — verified, not assumed

The central security claim is *"with AI off, the server stores only ciphertext it cannot read."* This was verified two ways against a live database:

1. **API integration test** — encrypt a message, persist via the `Message` model, read the raw Mongo document, assert the plaintext substring appears nowhere in the serialized row, then decrypt with CK and assert exact recovery.
2. **Socket E2E** — partner A encrypts `"you are my favourite person, always 💜"`, sends it over a real Socket.io connection; partner B (who independently recovered the same CK from a sealed share) receives **ciphertext** and decrypts it; the persisted DB row is then queried directly and confirmed to contain **no plaintext**, only the ciphertext.

Both pass. A different CK cannot decrypt stored ciphertext (tested).

---

## 3. Findings by dimension

### 3.1 Authentication / JWT — OK
- Tokens are HttpOnly cookies (`sameSite: strict`, `secure` in prod) with a `jti` revocation list in Redis.
- Verified: unauthenticated and tampered-signature requests both return 401. Wrong password returns 400. Duplicate signup rejected.

### 3.2 Authorization / IDOR — OK
- `relationshipGuard` blocks key-distribution + AI endpoints without an active relationship (verified 403).
- `getKeyBundle` returns the partner's **public** keys + userId only; the wrapped private-key blobs are never included (asserted absent in the bundle JSON).

### 3.3 Input validation / injection — OK
- All socket + REST inputs are Zod-validated (`sendMessageSchema`, `publishIdentitySchema`, etc.). A non-UUID `clientGeneratedId` is rejected by the schema (observed during E2E development — the message was dropped until corrected).
- Mongoose with typed schemas; no string-concatenated queries.

### 3.4 Cryptographic design — OK with documented limits
- X25519 sealed-box + XChaCha20-Poly1305 AEAD + Argon2id (moderate limits), via libsodium-sumo.
- Every encrypted object is versioned (`{v, alg}`) for future rotation.
- Recovery uses a generic 256-bit code (Crockford base32 + checksum), **not** BIP39.
- Key hierarchy: identity (recoverable) → device (per-browser, revocable) → CK (per relationship). CK is sealed to both identity and devices, so password/recovery restores history.

### 3.5 Media — OK
- Images are encrypted client-side with a per-file key (wrapped under CK) and uploaded to Cloudinary as **raw ciphertext**; the delivery path fetches ciphertext and decrypts to an in-memory blob URL. Cloudinary never holds plaintext pixels.

### 3.6 Opt-in AI bridge — OK, consent explicit
- AI can read messages **only** when a couple seals CK to the server AI key; the worker re-checks `wrappedCKForAI` at processing time, so revocation takes effect immediately. Disabling deletes the wrapped key and stamps `aiRevokedAt`.

---

## 4. Known limitations (by design, documented)

1. **No forward secrecy.** One long-lived CK per relationship; CK compromise exposes history. Future: Double Ratchet anchored on the device keys already in the schema.
2. **New-device CK distribution** relies on an existing device or the partner being online to re-seal CK; full automated device-approval UX is deferred (schema is in place).
3. **Recovery loss is terminal.** Losing both password and recovery code means history is unrecoverable — the cost of true zero-knowledge.
4. **AI opt-in is a real trust grant.** When on, the server can read future messages; this is surfaced explicitly in a consent screen, not a silent toggle.

---

## 5. Environment notes for reproduction

```bash
# Infra
redis-server --port 6379 --daemonize yes
mongod --dbpath <tmp> --port 27017

# Suites
cd packages/crypto && npx vitest run                 # 16
cd apps/api && npx vitest run                         # 8 (needs live mongo)
# start API with test Mongo/Redis + generated AI keys, then:
npx tsx e2e/socket-e2e.ts                             # 11 (two-partner live)
```

A pre-existing toolchain quirk: `vitest@4` pulls `rolldown`, whose native binding must be reinstalled after each `npm install` (`npm i @rolldown/binding-darwin-arm64 --no-save`); jsdom has a broken transitive dep, so the web unit test runs under `--environment node`. Neither affects production code.
