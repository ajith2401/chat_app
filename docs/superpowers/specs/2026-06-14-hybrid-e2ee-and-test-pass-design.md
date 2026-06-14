# Hybrid E2EE + Full Test Pass — Design Spec

**Date:** 2026-06-14
**Project:** "A Space for Us" (couple-chat monorepo)
**Status:** Approved-with-changes (6 review items folded in); pending final spec review.

---

## 1. Goal

Add **hybrid end-to-end encryption** to the chat app and follow it with a **full test pass** (crypto units, API integration, security audit, Playwright E2E, live run).

- **Zero-knowledge by default.** The server stores ciphertext and never holds the keys needed to read message bodies.
- **Opt-in AI.** A couple may explicitly grant the server-side AI worker read access so the existing AI features (embeddings, emotion engine, semantic search) keep working. Off by default.

Non-goals (MVP): forward secrecy / Double Ratchet, full multi-device approval UX, encrypting structural metadata (sender/timestamps/relationshipId). These are documented as future work.

---

## 2. Crypto primitives

| Concern | Choice |
| --- | --- |
| Library | `libsodium-wrappers` (WASM; browser + Node worker) |
| Key agreement / sealing | X25519 via `crypto_box_seal` (anonymous sealed box) |
| Symmetric AEAD | XChaCha20-Poly1305 (`crypto_aead_xchacha20poly1305_ietf`) |
| Password KDF | Argon2id (`crypto_pwhash`, moderate/interactive limits chosen per-target) |
| Recovery secret | 256-bit CSPRNG, Crockford base32, grouped `ABCD-EFGH-IJKL-MNOP-QRST-UVWX` + checksum group. **Not BIP39.** |

### 2.1 Versioning (review item #3)

Every encrypted object carries an envelope:

```json
{ "v": 1, "alg": "xchacha20poly1305" }
```

Applied to: message bodies, wrapped private keys, wrapped conversation keys, media blobs, reaction ciphertext, and AI grants. `v:0` is reserved for legacy plaintext (see §7).

---

## 3. Key hierarchy (review item #2 — device keys)

```
Identity Key (long-term, per user)      X25519 idPub / idPriv
        │
        ├─ recovered via Password Vault (Argon2id(password))
        └─ recovered via Recovery Secret (256-bit code)
        │
Device Key (per browser/device)         X25519 devicePub / devicePriv
        │
Conversation Key (CK, per relationship) XChaCha20-Poly1305 symmetric
        │
        ├─ sealed to each partner's device(s)
        └─ (optional) sealed to server AI key when AI opt-in is ON
```

**Why device keys now:** the password vault already enables basic multi-device (any browser that knows the password re-derives `idPriv` → CK). Device keys exist for **revocation, device approval, and as the anchor a future Double Ratchet will need**. We land the data model + per-device CK sealing now; the approval/revocation **UX** is next-phase. CK is sealed **per-device** (`devicePub`), never to the identity key directly, so the model never has to change later.

### 3.1 Stored key material (server holds only opaque ciphertext + public keys)

`User`:
- `identityPub: string`
- `wrappedIdPrivByPassword: { v, alg, salt, nonce, ct }`
- `wrappedIdPrivByRecovery: { v, alg, salt, nonce, ct }`
- `devices: [{ deviceId, devicePub, lastSeen, revokedAt? }]`

`Relationship`:
- `ckShares: [{ deviceId, sealedCK }]` — CK sealed to each active device
- `wrappedCKForAI?: { v, alg, ct }` — present only while AI opt-in is ON
- `aiGrantVersion: number`, `aiGrantedAt?: Date`, `aiRevokedAt?: Date`

`Message`:
- `content: string` — ciphertext (base64) for `v>=1`; plaintext for legacy `v:0`
- `enc: { v, alg, nonce }`
- `mediaKey?: { v, alg, nonce, ct }` — per-file key wrapped under CK (image messages)
- `reactions: [{ userId, emojiEnc: { v, alg, nonce, ct } }]` — encrypted emoji (review item #6)

The server can **never** derive `idPriv`, CK, or any message body unless AI opt-in is ON.

---

## 4. Message & media flows

### 4.1 Text
- **Send:** client encrypts `content` with CK → `{ct, nonce}`; stores ct in `content`, envelope in `enc`. Server persists blind and broadcasts.
- **Receive:** client decrypts with in-memory CK at render time.

### 4.2 Images (encrypted media)
- Client generates a fresh per-file key, encrypts file bytes (XChaCha20-Poly1305), uploads **ciphertext** to Cloudinary as a **raw** upload.
- Per-file key is wrapped under CK → stored as `message.mediaKey`.
- On display, client downloads ciphertext, unwraps the file key with CK, decrypts to a `Blob` URL.
- Replaces today's Cloudinary image-transform delivery URL in `ChatBubble` (real change).

### 4.3 Reactions (review item #6)
- Emoji encrypted under CK before send; decrypted client-side. No server-side reaction aggregation exists, so nothing is lost.

### 4.4 Already-covered metadata
- Reply previews render `replyTo.content` (ciphertext, decrypted client-side) → already encrypted.
- Image captions / edited text: features don't exist yet; when added they ride the encrypted `content` field (YAGNI now, fields versioned).

---

## 5. Key recovery (password vault + recovery secret)

- At signup the client generates `idPub/idPriv`, wraps `idPriv` twice (password-derived key, recovery-secret-derived key), and registers the first device.
- The recovery code is shown **once** at signup with explicit "store this safely" UX.
- Login: re-derive password key → unwrap `idPriv` → on this device, generate/register device key, fetch `ckShares` for this device (or have a partner/own other device re-seal CK to the new `devicePub`).
- Password change re-wraps `wrappedIdPrivByPassword` (recovery wrap unaffected).
- **Documented loss mode:** losing *both* password and recovery code = history unrecoverable, by design (true zero-knowledge).

---

## 6. Opt-in AI bridge (review item #4 — lifecycle)

- Server holds an **AI keypair**: `aiPub` (public, shipped to clients) and `aiPriv` (secret, in API/worker env).
- **Enable** (explicit consent screen, not a silent toggle): client seals CK to `aiPub` → stores `wrappedCKForAI`, sets `aiGrantedAt`, bumps `aiGrantVersion`; `featureFlags` gains `ai-insights`.
- **Worker** (`aiProcessor.ts`): if `wrappedCKForAI` present, unwrap CK with `aiPriv`, decrypt content, run embeddings/emotion as today. `send_message` enqueues an AI job **only** when the flag is on.
- **Disable:** delete `wrappedCKForAI`, set `aiRevokedAt`. Copy: *"AI will no longer process future messages. Previously generated insights remain."*
- Documented alternative (not built): **AI Memory Vault** — client produces encrypted summaries for AI instead of granting raw CK access. Stricter privacy, weaker AI; current bridge chosen for capability with explicit consent.

---

## 7. Legacy migration

- Existing plaintext messages are treated as `enc.v = 0` and rendered as-is.
- Only new messages are encrypted. No destructive migration. Called out in the implementation plan and release notes.

---

## 8. Forward-secrecy limitation (review item #5)

**MVP:** one long-lived CK per relationship. If CK leaks, full history is exposed.
**Future:** Signal-style Double Ratchet / per-session keys, anchored on the device keys from §3.
Stated plainly so no one assumes Signal-grade guarantees.

---

## 9. Code changes by package

- **`packages/crypto` (new):** all libsodium primitives — keygen, Argon2id wrap/unwrap, seal/open, message & file encrypt/decrypt, recovery-code encode/decode, version envelopes. Pure, no I/O, fully unit-tested.
- **`packages/database`:** extend `User`, `Relationship`, `Message` per §3.1.
- **`packages/validation`:** message schema accepts ciphertext `content` + `enc` envelope + optional `mediaKey`/`reactions` ciphertext.
- **`apps/api`:** new `/keys` routes (publish `identityPub`/device, fetch wrapped privs, store/read `ckShares`, AI grant enable/disable); auth controller stores/returns key blobs on signup/login.
- **`apps/web`:** `CryptoContext` (unlock `idPriv` on login, hold CK in memory); encrypt-on-send / decrypt-on-render in chat; encrypted image up/download in `ChatBubble`; recovery-code screen at signup + restore screen; explicit AI consent screen in Settings.
- **`apps/worker`:** CK-unwrap path gated on `wrappedCKForAI`.

---

## 10. Testing pass (full suite + live run)

1. **Crypto units** (`packages/crypto`, Jest): enc/dec round-trip; wrong key fails; single-byte tamper fails AEAD; recovery-code restore; password-vault unwrap; seal-to-device; reaction enc/dec; version-envelope handling.
2. **API integration** (supertest + ephemeral Mongo/Redis): auth, relationships, messages, media signature, `/keys`, authz isolation via `relationshipGuard`, JWT expiry/tamper.
3. **Security audit** (report + tests): JWT handling, NoSQL-injection probes, IDOR / cross-relationship access, Cloudinary signature integrity, **stored-docs-are-ciphertext assertion** (no plaintext leakage with AI off), headers/rate-limit check.
4. **Playwright E2E** (dual browser contexts = two partners): signup→keys→recovery code, login unlock, live encrypted text over Socket.io, encrypted image send, AI opt-in effect, session-expiry handling.
5. **Live run:** docker-compose (Mongo+Redis) + API + worker + web; run all suites; report real pass/fail output (no green-washing).

---

## 11. Delivery sequencing (staged PRs)

1. `packages/crypto` + unit tests
2. Key management (models, `/keys` routes, signup/login key blobs, recovery code UI)
3. Message text encryption (web encrypt/decrypt, validation, legacy `v:0` path)
4. Encrypted media (image up/download, `ChatBubble`)
5. Reactions encryption + AI opt-in bridge + worker gating
6. Full test pass + security audit + live run

Each stage is independently reviewable and testable.
