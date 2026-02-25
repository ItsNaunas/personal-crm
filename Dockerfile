# ── Stage 1: Build ─────────────────────────────────────────────────────────────
# node:20-slim (Debian) used instead of Alpine for ARM64/Prisma compatibility
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first (layer-cache friendly)
COPY package*.json ./
RUN npm ci

# Copy source and generate Prisma client
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production image ───────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Prisma requires OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy only what's needed to run
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
