FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune integrations --docker

FROM oven/bun:1 AS installer
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y nodejs npm

# Install pnpm
RUN npm install -g pnpm

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
WORKDIR /app/integrations
RUN bun run build
RUN bun run build:services

FROM oven/bun:1 AS runner
WORKDIR /app

COPY --from=installer --chown=bun:bun /app/integrations/dist ./dist
COPY --from=installer --chown=bun:bun /app/integrations/services ./services

# Environment Variables
ENV SAYR_API_KEY=""
ENV DISCORD_BOT_TOKEN=""
ENV DISCORD_BOT_INVITE_URL=""
ENV DATABASE_URL=""
ENV APP_ENV="production"

USER bun
CMD ["bun", "run", "dist/index.js"]