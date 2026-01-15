FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune backend --docker

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

# Build the project
WORKDIR /app/apps/backend
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app

COPY --from=installer /app/apps/backend/dist ./dist
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/backend/package.json ./package.json

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
ENV SAYR_CLOUD=""
ENV APP_ENV="production"

# Expose the port the app runs on
EXPOSE 5468

CMD ["bun", "run", "dist/index.js"]
