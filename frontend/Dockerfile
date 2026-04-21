# ── deps ──
FROM node:24-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ── builder ──
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG BUILD_VERSION=dev
ENV NEXT_PUBLIC_BUILD_VERSION=${BUILD_VERSION}

RUN pnpm build

# ── runner ──
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

ARG BUILD_VERSION=dev
ENV NEXT_PUBLIC_BUILD_VERSION=${BUILD_VERSION}

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
