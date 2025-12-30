FROM node:22.19.0-alpine AS base

FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
RUN npm install -g turbo
RUN npm install -g pnpm

# Copy all files needed for turbo prune
COPY . .

# Prune the workspace for the 'start' app
RUN turbo prune start --docker

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

# Build arguments for Next.js (with placeholders for runtime replacement)
ARG NEXT_PUBLIC_URL_ROOT="___NEXT_PUBLIC_URL_ROOT___"
ARG NEXT_PUBLIC_API_SERVER="___NEXT_PUBLIC_API_SERVER___"
ARG NEXT_PUBLIC_PROJECT_NAME="___NEXT_PUBLIC_PROJECT_NAME___"
ARG NEXT_PUBLIC_WS_URL="___NEXT_PUBLIC_WS_URL___"
ARG NEXT_PUBLIC_ROOT_DOMAIN="___NEXT_PUBLIC_ROOT_DOMAIN___"
ARG NEXT_PUBLIC_EXTERNAL_API_URL="___NEXT_PUBLIC_EXTERNAL_API_URL___"
ARG NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_TOKEN="___NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_TOKEN___"
ARG NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_DATASET="___NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_DATASET___"
# Set environment variables for build time
ENV NEXT_PUBLIC_URL_ROOT=$NEXT_PUBLIC_URL_ROOT
ENV NEXT_PUBLIC_API_SERVER=$NEXT_PUBLIC_API_SERVER
ENV NEXT_PUBLIC_PROJECT_NAME=$NEXT_PUBLIC_PROJECT_NAME
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN
ENV NEXT_PUBLIC_EXTERNAL_API_URL=$NEXT_PUBLIC_EXTERNAL_API_URL
ENV NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_TOKEN=$NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_TOKEN
ENV NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_DATASET=$NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_DATASET

ENV IS_DOCKER 1

# Build the Next.js application
RUN cd apps/web && pnpm exec next telemetry disable && pnpm run build

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV IS_DOCKER=1
ENV PORT=3000

# Server-side Environment Variables
ENV DATABASE_URL=""
ENV DORAS_CLIENT_ID=""
ENV DORAS_CLIENT_SECRET=""
ENV STORAGE_URL=""
ENV STORAGE_BUCKET=""
ENV STORAGE_ACCESS_KEY=""
ENV STORAGE_SECRET_KEY=""
ENV FILE_SALT=""
ENV FILE_CDN=""
ENV GITHUB_CLIENT_ID=""
ENV GITHUB_CLIENT_SECRET=""
ENV GITHUB_APP_ID=""
ENV GITHUB_APP_PRIVATE_KEY=""
ENV GITHUB_WEBHOOK_SECRET=""
ENV STORAGE_PORT=""
ENV FILE_NAME_HASH_LENGTH=""
ENV DORAS_ORGANIZATION=""
ENV BETTER_AUTH_SECRET=""

# Copy entrypoint script
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# Copy necessary files for running Next.js
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "apps/web/server.js"]