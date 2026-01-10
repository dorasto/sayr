FROM node:22.19.0-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
RUN npm install -g pnpm

# Copy all files needed for turbo prune
COPY . .

# Prune the workspace for the 'marketing' app
RUN turbo prune marketing --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/out/full/ .

RUN pnpm install

# Build the application
RUN cd apps/marketing && pnpm run build

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astro
USER astro

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

# Copy built output and node_modules from installer stage
COPY --from=installer --chown=astro:nodejs /app/apps/marketing/dist ./dist
COPY --from=installer --chown=astro:nodejs /app/node_modules ./node_modules

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
