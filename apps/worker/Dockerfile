FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune worker --docker

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
ENV SAYR_EDITION_BAKED=$SAYR_EDITION_BAKED

# Build the project
WORKDIR /app/apps/worker
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app

COPY --from=installer /app/apps/worker/dist ./dist

# Environment Variables
ENV DATABASE_URL=""
ENV DORAS_CLIENT_ID=""
ENV DORAS_CLIENT_SECRET=""
ENV STORAGE_URL=""
ENV STORAGE_BUCKET=""
ENV STORAGE_ACCESS_KEY=""
ENV STORAGE_SECRET_KEY=""
ENV FILE_SALT=""
ENV FILE_CDN=""
ENV SAYR_EMAIL=""
ENV GITHUB_CLIENT_ID=""
ENV GITHUB_CLIENT_SECRET=""
ENV GITHUB_APP_ID=""
ENV GITHUB_APP_PRIVATE_KEY=""
ENV GITHUB_WEBHOOK_SECRET=""
ENV STORAGE_PORT=""
ENV FILE_NAME_HASH_LENGTH=""
ENV DORAS_ORGANIZATION=""
ENV BETTER_AUTH_SECRET=""
ENV REDIS_URL=""
ENV INTERNAL_SECRET=""
ENV AXIOM_OTEL_TOKEN=""
ENV AXIOM_OTEL_DOMAIN=""
ENV AXIOM_OTEL_DATASET=""
ENV SAYR_EDITION_BAKED=""
ENV APP_ENV="production"

CMD ["bun", "run", "dist/index.js"]
