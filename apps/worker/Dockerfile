FROM node:20-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune worker --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN npx turbo run build --filter=worker

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 workeruser
USER workeruser

COPY --from=installer /app/apps/worker/dist ./dist
COPY --from=installer /app/apps/worker/package.json .
COPY --from=installer /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]
