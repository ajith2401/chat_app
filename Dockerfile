# Backend container for Koyeb: runs BOTH the Express+Socket.io API and the
# BullMQ worker in one image (Koyeb's free tier gives a single instance).
# The web frontend is deployed separately to Vercel.
FROM node:20-slim

WORKDIR /app

# Root manifests first (better layer caching for the install step).
COPY package.json package-lock.json ./

# Workspace source (.dockerignore keeps node_modules/.next/etc. out).
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
COPY apps/web/package.json ./apps/web/package.json
COPY packages ./packages

# Install the whole workspace (tsx + concurrently come from here).
# apps/web has only its manifest here, so its deps install but its app isn't built.
RUN npm ci

ENV NODE_ENV=production
# Koyeb injects PORT; the API reads process.env.PORT. Expose for clarity.
EXPOSE 8000

# Run API + worker together; if either exits, the container exits (Koyeb restarts it).
CMD ["npx", "concurrently", "--kill-others-on-fail", "--names", "api,worker", \
     "tsx apps/api/src/index.ts", "tsx apps/worker/src/index.ts"]
