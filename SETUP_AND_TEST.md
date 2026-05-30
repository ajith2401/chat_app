# Setup & Testing Guide: Premium Couple-Chat

This guide provides step-by-step instructions to get the application running locally and verify its core features.

---

## 1. Prerequisites
- **Node.js**: v20 or higher
- **Docker & Docker Compose**: For MongoDB and Redis
- **OpenAI API Key**: Required for Emotion Engine & Semantic Search
- **Cloudinary Account**: For media uploads and automatic optimization.

---

## 2. Local Setup

### Step 1: Clone & Install
```bash
# Clone the repository
git clone <your-repo-url>
cd couple-chat

# Install dependencies from the root
npm install
```

### Step 2: Environment Configuration
1. Copy the `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your `OPENAI_API_KEY` and **Cloudinary** credentials.

### Step 3: Infrastructure (Docker)
Start the background services (MongoDB & Redis):
```bash
docker-compose up -d mongodb redis
```

### Step 4: Run the Application
Start all services in development mode using Turborepo:
```bash
npm run dev
```
This will concurrently start:
- **API** (localhost:4000)
- **Web** (localhost:3000)
- **Worker** (Background processing)

---

## 3. Testing & Verification Plan

### Phase 1: Authentication & Relationship (REST)
1. **Signup**: POST to `/api/v1/auth/signup` with `email`, `password`, and `name`.
2. **Create Relationship**: With the returned JWT, POST to `/api/v1/relationships/create`. This makes you the primary user of a new "Space."
3. **Invite Partner**: Copy the `relationshipId` and have a second user POST to `/api/v1/relationships/join` with that ID.

### Phase 2: Real-time Messaging (Socket.io)
1. **Connect**: Open the frontend at `localhost:3000/chat`.
2. **Messaging**: Send a message. Verify:
   - The message appears **instantly** (Optimistic UI).
   - The status changes from `sent` to `delivered` (once the server acknowledges).
3. **Presence**: Open a second browser tab as the partner. Verify:
   - The "online" indicator glows.
   - "Typing..." indicators appear when the other user types.

### Phase 4: Media & Background Workers
1. **Upload**: Use the "Media" feature to upload an image to Cloudinary.
2. **Check Worker Logs**: In your terminal, look for the `Worker` output. You should see `Cloudinary managing media for ...`.
3. **Verify Cloudinary**: Check your Cloudinary Media Library for the uploaded image and its generated transformations (thumbnails/blur).

### Phase 5: AI & Emotional Intelligence
1. **Sentiment**: Send a few "romantic" messages, then some "missing you" messages.
2. **Ambient UI**: Verify the background gradient shifts softly (e.g., to a rose-tinted hue for romantic moods).
3. **Semantic Search**: Wait 30 seconds for the worker to generate embeddings. Then use the search bar: "When did we mention the trip?". It should find the message even without an exact keyword match.

---

## 4. Troubleshooting
- **Socket Disconnects**: Ensure the `NEXT_PUBLIC_SOCKET_URL` in `.env` matches your API address.
- **Worker not processing**: Ensure Redis is running (`docker ps`) and the `REDIS_URL` is correct in both `.env` and `docker-compose.yml`.
- **OpenAI Errors**: Check your API key usage and billing limits.
- **Zod Validation Failures**: Ensure the frontend is sending the exact structure defined in `packages/validation`.

---

## 5. Production Deployment
The application is ready for Dockerized deployment.
1. Build the images: `docker-compose build`
2. Set `NODE_ENV=production`
3. Use a managed MongoDB (like Atlas) and Managed Redis for scalability.
4. Set up an Nginx reverse proxy to handle SSL and port forwarding.
