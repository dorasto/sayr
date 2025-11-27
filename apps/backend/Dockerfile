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

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code of isolated subworkspace
COPY --from=builder /app/out/full/ .

# Build the project
WORKDIR /app/apps/backend
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app

COPY --from=installer /app/apps/backend/dist ./dist

# Expose the port the app runs on
EXPOSE 5468

CMD ["bun", "run", "dist/index.js"]
