FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune discordbot --docker

# Official Node 22 image (same Debian release — trixie — as oven/bun:1 below,
# so the bun binary copied in next is glibc-compatible) instead of apt-get'ing
# Debian's own "nodejs" package, which lags behind and is too old for pnpm's
# engine requirement (>=22.13).
FROM node:22-trixie-slim AS installer
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

# Install pnpm via corepack (ships with Node) — matches the zerops.yml build path
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lockfile and package.json's of isolated subworkspace
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
ENV NODE_ENV=production

# Install dependencies
RUN pnpm install

# Copy source code of isolated subworkspace
COPY --from=builder /app/out/full/ .

# Edition baking: set at Docker build time, compiled into JS bundle
ARG SAYR_EDITION_BAKED="community"

# Build the project
WORKDIR /app/integrations/services/discordbot
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app

COPY --from=installer /app/integrations/services/discordbot/dist ./dist

# Environment Variables
ENV APP_ENV="production"

CMD ["bun", "run", "dist/index.js"]
