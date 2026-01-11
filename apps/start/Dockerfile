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

# Build arguments for Vite/TanStack Start (with placeholders for runtime replacement)
ARG VITE_URL_ROOT="___VITE_URL_ROOT___"
ARG VITE_PROJECT_NAME="___VITE_PROJECT_NAME___"
ARG VITE_ROOT_DOMAIN="___VITE_ROOT_DOMAIN___"
ARG VITE_GITHUB_APP_NAME="___VITE_GITHUB_APP_NAME___"
ARG VITE_SAYR_FRONTEND_AXIOM_DATASET="___VITE_SAYR_FRONTEND_AXIOM_DATASET___"
ARG VITE_SAYR_FRONTEND_AXIOM_TOKEN="___VITE_SAYR_FRONTEND_AXIOM_TOKEN___"
ARG VITE_TENOR_API="___VITE_TENOR_API___"


# Set environment variables for build time
ENV VITE_URL_ROOT=$VITE_URL_ROOT
ENV VITE_PROJECT_NAME=$VITE_PROJECT_NAME
ENV VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN
ENV VITE_GITHUB_APP_NAME=$VITE_GITHUB_APP_NAME
ENV VITE_SAYR_FRONTEND_AXIOM_DATASET=$VITE_SAYR_FRONTEND_AXIOM_DATASET
ENV VITE_SAYR_FRONTEND_AXIOM_TOKEN=$VITE_SAYR_FRONTEND_AXIOM_TOKEN
ENV VITE_TENOR_API=$VITE_TENOR_API

ENV IS_DOCKER=1

# Build the application
RUN cd apps/start && pnpm run build

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 reactjs
USER reactjs

ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
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
ENV INTERNAL_SECRET=""
ENV GITHUB_APP_ID=""
ENV GITHUB_APP_PRIVATE_KEY=""
ENV GITHUB_WEBHOOK_SECRET=""
ENV GITHUB_CLIENT_ID=""
ENV GITHUB_CLIENT_SECRET=""
ENV SAYR_EMAIL=""
ENV DORAS_ORGANIZATION=""
ENV SAYR_CLOUD=""
ENV APP_ENV="production"

# Copy entrypoint script
COPY --from=builder --chown=reactjs:nodejs /app/apps/start/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Copy necessary files
# TanStack Start / Nitro outputs to .output
COPY --from=installer --chown=reactjs:nodejs /app/apps/start/.output ./.output

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]