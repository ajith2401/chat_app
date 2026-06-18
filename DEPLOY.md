# Deploying "A Space for Us"

This app is 3 services, so it deploys to **two** platforms:

| Part | Platform | Why |
| --- | --- | --- |
| `apps/web` (Next.js) | **Vercel** | Perfect fit for the frontend |
| `apps/api` + `apps/worker` | **Koyeb** (one Docker container) | Needs persistent WebSocket + background process; Koyeb's free Nano instance never sleeps |
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
Your cluster exists. Just allow Koyeb to reach it:
1. Atlas → **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`).
   (Koyeb doesn't publish fixed egress IPs on the free tier, so this is required.)
2. Confirm the DB user `couplechatmemory_db_user` exists with read/write. (Connection string is already in `.env.deploy.local`.)

## Step 3 — Deploy the backend to Koyeb (10 min)
1. Sign up at https://koyeb.com (GitHub login).
2. **Create Web Service** → **GitHub** → pick `ajith2401/chat_app`, branch `main`.
3. Builder: **Dockerfile** (Koyeb auto-detects the root `Dockerfile`).
4. Instance: **Free** (Nano). Region: near you.
5. **Exposed port: `8000`** (the container listens on `$PORT`; set the port to 8000 and protocol HTTP).
6. **Environment variables** — add every var from the `# ---- KOYEB ----` section of `.env.deploy.local`:
   `NODE_ENV, JWT_SECRET, MONGODB_URI, REDIS_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, OPENAI_API_KEY, AI_PUBLIC_KEY, AI_PRIVATE_KEY`.
   (Leave `CLIENT_URL` for Step 5. Don't set `PORT` — Koyeb injects it.)
7. Deploy. When healthy, copy the public URL, e.g. `https://couple-chat-xxxx.koyeb.app`.
8. Sanity check: open `https://<koyeb-app>.koyeb.app/health` → should return `{"status":"ok"}`.

## Step 4 — Deploy the web to Vercel (5 min)
1. https://vercel.com → **Add New → Project** → import `ajith2401/chat_app`.
2. **Root Directory: `apps/web`** (click Edit → select it). Framework auto-detects **Next.js**.
   (The committed `apps/web/vercel.json` sets the install command to run from the monorepo root so the workspace packages resolve.)
3. **Environment Variables** — add the `# ---- VERCEL ----` vars from `.env.deploy.local`, replacing `<koyeb-app>` with your real Koyeb URL:
   - `NEXT_PUBLIC_API_URL = https://<koyeb-app>.koyeb.app/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL = https://<koyeb-app>.koyeb.app`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = duq485wsm`
   - `NEXT_PUBLIC_AI_PUBLIC_KEY = <the AI public key>`
4. Deploy. Copy the Vercel URL, e.g. `https://couple-chat.vercel.app`.

## Step 5 — Connect the two (CORS) (2 min)
1. Back in **Koyeb → your service → Environment variables**, set:
   - `CLIENT_URL = https://<your-vercel-url>`  (no trailing slash; comma-separate if you add more origins)
2. Redeploy the Koyeb service so CORS allows the Vercel origin.
3. Open the Vercel URL and sign up. 🎉

---

## How the pieces talk
- Browser (Vercel) → REST + WebSocket → Koyeb API (`NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL`).
- The CSP `connect-src` is derived from `NEXT_PUBLIC_SOCKET_URL`, so the Koyeb origin (https + wss) is allowed automatically.
- Auth cookie is `SameSite=None; Secure` in production so it works cross-site (Vercel ↔ Koyeb). This needs HTTPS — both platforms provide it.

## Gotchas
- **OpenAI key is a placeholder.** AI mood insights stay off until you set a real `OPENAI_API_KEY` on Koyeb. Core encrypted chat does not need it.
- **Upstash must be the `rediss://` TCP URL**, not the REST URL — BullMQ uses blocking Redis commands.
- **Free Nano = 512 MB.** Fine for the two of you; not for scale.
- **First request after a deploy** can be a few seconds while libsodium/WASM warms up.
- This is a **different MongoDB** than your local test data — you and your partner sign up fresh on the deployed site.

## Updating later
Push to `main` → Koyeb and Vercel both auto-redeploy from GitHub.
