# Run "A Space for Us" — test with your partner today

Everything is wired for a local run. Pick one of the two setups below.

## Prerequisites (already installed on this Mac)
- `mongod` and `redis-server` (Homebrew) — the launcher starts them for you.
- Node + npm (you already have these).

> Cloudinary is pre-configured for image messages. AI mood insights are **off by default** (opt in from Settings) and need a valid `OPENAI_API_KEY` in `.env` to do anything — not required for chatting.

---

## Option A — Both of you on this Mac (simplest, 100% reliable)

```bash
bash scripts/run-local.sh
```

Then:
1. Open **http://localhost:3005** in your normal browser → sign up as you.
2. **Save the recovery code** it shows you (this is your E2EE backup).
3. Choose **Start New Space** → copy the invite code.
4. Open a **second browser profile or an Incognito/Private window** → http://localhost:3005 → your partner signs up there.
5. Partner pastes the invite code → **Join Partner**.
6. Within a few seconds the secure channel forms and you can chat. Messages are end-to-end encrypted.

(Two separate browser profiles are required — each holds its own keys. Two tabs in the same profile would share one identity.)

---

## Option B — Her on her own phone/laptop (same WiFi)

```bash
bash scripts/run-local.sh --lan
```

The launcher prints a URL like `http://192.168.1.23:3005`.
- You open that URL on your Mac.
- **She opens the same URL on her phone** (must be on the same WiFi).
- Same steps as above: you Start New Space, she Joins with the code.

If her phone can't load it, your WiFi may block device-to-device traffic (common on public/guest networks). Use a home network, or fall back to Option A.

---

## Stopping

```bash
bash scripts/stop-local.sh
```

(MongoDB + Redis are left running; the script tells you how to stop them too.)

---

## What works
- ✅ Signup / login, invite + join a private space
- ✅ **End-to-end encrypted** text messages (server stores only ciphertext)
- ✅ Encrypted images (uploaded as ciphertext, decrypted in your browser)
- ✅ Recovery code + password unlock on a new device/browser
- ✅ Typing indicators, presence, seen receipts, reactions
- ✅ Optional AI mood insights (Settings → enable, explicit consent)

## Good to know
- **Recovery code matters.** If you clear your browser and forget your password, the recovery code is the only way back to your message history. Lose both → that history is gone (that's what end-to-end encryption guarantees).
- First sign-up is a touch slow (~2–4s): the browser is generating crypto keys.
- The app has a login rate limit (20 auth attempts / 15 min). Normal use never hits it; if you're rapidly testing and see "Something went wrong" on signup, wait a few minutes or restart the API.

## If something's off
- Logs are in `.local-logs/` (`api.log`, `worker.log`, `web.log`).
- Restart everything: `bash scripts/stop-local.sh && bash scripts/run-local.sh`.
