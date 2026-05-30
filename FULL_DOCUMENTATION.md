# ✦ Full Technical Documentation: Premium Couple-Chat

This document provides a comprehensive overview of the "A Space for Us" platform, covering architecture, stack, APIs, real-time protocols, and security.

---

## 1. Executive Summary
The platform is a private, invite-only web application designed exclusively for couples. It prioritizes emotional immersion, cinematic aesthetics, and data privacy. It leverages real-time synchronization, AI-powered emotional intelligence, and a decoupled background worker architecture to ensure a premium user experience.

---

## 2. Tech Stack

### Frontend Overview
*   **Framework**: Next.js 14 (App Router)
*   **Styling**: Tailwind CSS
*   **Animations**: Framer Motion (Cinematic transitions & auras)
*   **State Management**: Zustand (Optimistic UI & real-time sync)
*   **Icons**: Lucide React
*   **Communication**: Socket.io Client & Axios

### Backend Overview
*   **Runtime**: Node.js (TypeScript via tsx/tsup)
*   **Server**: Express.js
*   **Real-time**: Socket.io (WebSocket with Polling fallback)
*   **Queue System**: BullMQ + Redis (Asynchronous AI & Media jobs)
*   **Database**: MongoDB (Atlas Vector Search for memory)
*   **Authentication**: JWT (JSON Web Tokens) with Bcrypt password hashing

### Infrastructure & DevOps
*   **Monorepo**: Turborepo
*   **Storage**: Cloudinary (Secure signed uploads & transformations)
*   **Environment**: Dockerized (MongoDB, Redis, API, Worker)

---

## 3. System Architecture

The application follows a **Domain-Driven Design (DDD)** and **Event-Driven Architecture**.

### 3.1 Repository Structure
```text
/
├── apps/
│   ├── web/           # Next.js frontend (Cinematic UI)
│   ├── api/           # Express API & Socket Gateway
│   └── worker/        # Background processing (AI, Media)
├── packages/
│   ├── validation/    # Shared Zod schemas (API Contracts)
│   ├── shared-types/  # Shared TypeScript interfaces
│   └── ui/            # Common component library (future)
```

### 3.2 Internal Logic Flow
1.  **Request Layer**: REST API handles heavy state changes (Auth, Relationship creation).
2.  **Event Layer**: Internal `eventBus` (Node EventEmitter) decouples core logic from side effects.
3.  **Real-time Layer**: Socket.io manages "whispers" (messages), "vibes" (moods), and presence.
4.  **Worker Layer**: BullMQ processes heavy lifting (Image optimization, AI Embeddings) without blocking the UI.

---

## 4. Authentication & Security

### 4.1 Flow
1.  **Signup/Login**: Users provide credentials. API returns a 7-day JWT and User object.
2.  **Authorization**: JWT is stored in `localStorage` and sent in the `Authorization: Bearer <token>` header.
3.  **Session Refresh**: The frontend `/me` endpoint verifies token validity on every hard refresh.
4.  **Privacy Guard**: A `relationshipGuard` middleware ensures that users can only access data belonging to their specific `relationshipId`.

### 4.2 Socket Authentication
*   Sockets use the same JWT for the initial handshake.
*   The `socketAuthMiddleware` verifies the token and links the connection to a specific relationship room (`relationship:<id>`).

---

## 5. API Documentation (v1)

Base URL: `http://localhost:4000/api/v1`

### 5.1 Auth Domain
| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| POST | `/auth/signup` | Create new account | `{ email, password, name }` |
| POST | `/auth/login` | Log in | `{ email, password }` |
| GET | `/auth/me` | Get current profile | `Header: Bearer <token>` |
| PATCH | `/auth/me` | Update name/avatar | `{ name, avatarUrl }` |

### 5.2 Relationship Domain
| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| POST | `/relationships/create` | Start a new space | (Auth required) |
| POST | `/relationships/join` | Join a partner's space | `{ inviteCode }` |
| GET | `/relationships/me` | Get partner details | (Auth required) |
| POST | `/relationships/mood` | Update relationship vibe | `{ mood: "romantic" }` |

### 5.3 Messaging Domain
| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| GET | `/messages` | Fetch chat history | `limit`, `before` (cursor) |
| POST | `/messages/mark-seen`| Mark all messages as read | (Auth required) |

### 5.4 Journal & Story Domain
| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| GET | `/journals` | Fetch entries | `type` (journal/milestone) |
| POST | `/journals` | Create new memory | `{ title, content, type }` |

---

## 6. Real-time Protocols (Socket.io)

### 6.1 Client -> Server (Emitters)
*   `send_message`: `{ content, clientGeneratedId, type: "text"|"image" }`
*   `typing_start`: Triggered when user inputs text.
*   `typing_stop`: Triggered on blur or empty input.
*   `message_seen`: `{ messageId }` (Sent via IntersectionObserver).
*   `heartbeat`: Keeps presence active.

### 6.2 Server -> Client (Listeners)
*   `receive_message`: Appends new message to feed.
*   `message_updated`: Synchronizes optimistic UI with real DB status.
*   `user_typing`: Shows "[Name] is thinking...".
*   `presence_update`: Visual online/offline indicator.
*   `mood_changed`: Triggers ambient background color shift.

---

## 7. Functionalities & Features

### 7.1 Cinematic Experience
*   **Ambient Engine**: Background gradients shift based on relationship "Vibes."
*   **Optimistic Sync**: Messages appear instantly, with status checkmarks updating in real-time.
*   **Double-Checkmarks**: "Seen" receipts are automated via viewport detection.

### 7.2 Memory & AI
*   **Semantic Search**: (Backend Ready) Uses MongoDB Atlas Vector Search to find memories by meaning, not just keywords.
*   **Emotion Engine**: (Backend Ready) Analyzes chat trends using OpenAI GPT models.

---

## 8. Testing & Validation

### 8.1 Strategy
*   **Unit Tests**: Located in `apps/web/__tests__`. Focuses on State Logic (Zustand) and Utility functions.
*   **Contract Validation**: Every API request is validated via **Zod** (located in `packages/validation`).
*   **E2E Verification**: Real-time flows verified using dual-browser sessions.

### 8.2 Execution
```bash
# Run Web Tests
cd apps/web && npm test

# Run API Linting
cd apps/api && npm run lint
```

---

## 9. Setup for Developers
See the companion file: **[SETUP_AND_TEST.md](./SETUP_AND_TEST.md)** for local installation and verification steps.
