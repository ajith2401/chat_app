# Deploying "A Space for Us"

This app is 3 services, so it deploys to **two** platforms:

| Part | Platform | Why |
| --- | --- | --- |
| `apps/web` (Next.js) | **Vercel** | Perfect fit for the frontend |
| `apps/api` + `apps/worker` | **Render** (one Docker Web Service) | Needs persistent WebSocket + background process; the root `Dockerfile` runs both in one service |
| Database | **MongoDB Atlas** (free M0) | ✅ already created |
| Cache/queue | **Upstash Redis** (free) | Socket.io adapter + BullMQ |
| Images | **Cloudinary** | already configured |

> All filled-in env values are in **`.env.deploy.local`** (gitignored). Copy from there as you go.

---

## Step 0 — Push to GitHub (done by the assistant)
Repo: https://github.com/ajith2401/chat_app — branch `main`.

---

## Step 1 — Upstash Redis (5 min)
1. Sign up at https://upstash.com → **Create Database** → Redis → pick a region near you.
2. On the database page, copy the **`rediss://…` TCP URL** (NOT the REST URL — BullMQ needs the TCP/TLS endpoint).
3. Paste it into `.env.deploy.local` as `REDIS_URL`.

## Step 2 — MongoDB Atlas network access (2 min)
Your cluster exists. Just allow Render to reach it:
1. Atlas → **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`).
   (Render's free tier has no fixed egress IP, so this is required.)
2. Confirm the DB user `couplechatmemory_db_user` exists with read/write. (Connection string is already in `.env.deploy.local`.)

## Step 3 — Deploy the backend to Render (10 min)
1. Sign up at https://render.com (GitHub login).
2. **New → Web Service** → connect **GitHub** → pick `ajith2401/chat_app`, branch `main`.
3. Settings:
   - **Name:** `couple-chat-api` (anything)
   - **Language / Runtime:** **Docker**
   - **Root Directory:** *(leave BLANK)* — the `Dockerfile` is at the repo root and copies paths from root, so the build context must be the repo root.
   - **Dockerfile Path:** `./Dockerfile` (default)
   - **Instance Type:** **Free**
   - **Health Check Path:** `/health`
   - You do **not** set a port — the app listens on Render's injected `$PORT`, which Render auto-detects.
4. **Environment variables** — add every var from the `# ---- RENDER (backend) ----` section of `.env.deploy.local`:
   `NODE_ENV, JWT_SECRET, MONGODB_URI, REDIS_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, OPENAI_API_KEY, AI_PUBLIC_KEY, AI_PRIVATE_KEY`.
   (Leave `CLIENT_URL` for Step 5. Do **not** set `PORT` — Render injects it.)
5. **Create Web Service.** First build takes ~3–5 min.
6. Copy the public URL, e.g. `https://couple-chat-api.onrender.com`.
7. Sanity check: open `https://<your-app>.onrender.com/health` → `{"status":"ok"}`.

> ⚠️ Render's **free** Web Service **sleeps after ~15 min idle**. The first visit after a nap takes ~30–60s to wake, and it can briefly drop a live socket. Fine for testing with your partner; for always-on, upgrade to the $7 Starter instance.

## Step 4 — Deploy the web to Vercel (5 min)
1. https://vercel.com → **Add New → Project** → import `ajith2401/chat_app`.
2. **Root Directory: `apps/web`** (click Edit → select it). Framework auto-detects **Next.js**.
   (The committed `apps/web/vercel.json` sets the install command to run from the monorepo root so the workspace packages resolve.)
3. **Environment Variables** — add the `# ---- VERCEL ----` vars from `.env.deploy.local`, replacing `<render-app>` with your real Render URL:
   - `NEXT_PUBLIC_API_URL = https://<render-app>.onrender.com/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL = https://<render-app>.onrender.com`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = duq485wsm`
   - `NEXT_PUBLIC_AI_PUBLIC_KEY = <the AI public key>`
4. Deploy. Copy the Vercel URL, e.g. `https://couple-chat.vercel.app`.

## Step 5 — Connect the two (CORS) (2 min)
1. Back in **Render → your service → Environment**, set:
   - `CLIENT_URL = https://<your-vercel-url>`  (no trailing slash; comma-separate if you add more origins)
2. Save — Render redeploys automatically so CORS allows the Vercel origin.
3. Open the Vercel URL and sign up. 🎉

---

## How the pieces talk
- Browser (Vercel) → REST + WebSocket → Render API (`NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL`).
- The CSP `connect-src` is derived from `NEXT_PUBLIC_SOCKET_URL`, so the Render origin (https + wss) is allowed automatically.
- Auth cookie is `SameSite=None; Secure` in production so it works cross-site (Vercel ↔ Render). This needs HTTPS — both platforms provide it.

## Gotchas
- **OpenAI key is a placeholder.** AI mood insights stay off until you set a real `OPENAI_API_KEY` on Render. Core encrypted chat does not need it.
- **Upstash must be the `rediss://` TCP URL** (ioredis/Node tab), NOT the `UPSTASH_REDIS_REST_URL`/token — BullMQ + the Socket.io adapter use blocking Redis commands the REST API can't serve.
- **Render free sleeps after ~15 min idle** — first hit wakes in ~30–60s. Upgrade to Starter ($7) for always-on.
- **First request after a deploy** can be a few seconds while libsodium/WASM warms up.
- This is a **different MongoDB** than your local test data — you and your partner sign up fresh on the deployed site.

## Updating later
Push to `main` → Render and Vercel both auto-redeploy from GitHub.
