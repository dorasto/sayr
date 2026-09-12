# Debian (not Alpine) throughout — apps/start externalizes native deps (e.g.
# sharp, used by src/routes/api/og.tsx) at build time, so whatever libc they
# resolve against in the installer stage has to match the runner stage that
# actually executes them. Mixing Alpine's musl with a Debian-based install
# stage silently breaks those at runtime even though the image builds fine.
# Matches the fix already applied to apps/backend and apps/worker's
# Dockerfiles for the same pnpm 10 + musl incompatibility (see
# ERR_PNPM_PNPM_ENGINE_NO_NATIVE_BINARY: pnpm's packageManager
# self-management downloads a native @pnpm/exe binary for the pinned version,
# which pnpm doesn't ship for linux-x64-musl).
FROM node:22-trixie-slim AS base

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
RUN npm install -g pnpm

# Copy all files needed for turbo prune
COPY . .

# Prune the workspace for the 'start' app
RUN turbo prune start --docker

FROM base AS installer
WORKDIR /app

# Install pnpm via corepack (ships with Node) — matches apps/backend and
# apps/worker's Dockerfiles, and avoids the native-binary lookup that
# `npm install -g pnpm` triggers.
RUN corepack enable && corepack prepare pnpm@latest --activate

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
ARG VITE_KLIPY_API="___VITE_KLIPY_API___"
ARG VITE_APP_VERSION="___VITE_APP_VERSION___"

# Edition baking: set at Docker build time, compiled into server-side JS bundle
ARG SAYR_EDITION_BAKED="community"

# Set environment variables for build time
ENV VITE_URL_ROOT=$VITE_URL_ROOT
ENV VITE_PROJECT_NAME=$VITE_PROJECT_NAME
ENV VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN
ENV VITE_GITHUB_APP_NAME=$VITE_GITHUB_APP_NAME
ENV VITE_SAYR_FRONTEND_AXIOM_DATASET=$VITE_SAYR_FRONTEND_AXIOM_DATASET
ENV VITE_SAYR_FRONTEND_AXIOM_TOKEN=$VITE_SAYR_FRONTEND_AXIOM_TOKEN
ENV VITE_KLIPY_API=$VITE_KLIPY_API
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV SAYR_EDITION_BAKED=$SAYR_EDITION_BAKED
ENV APP_ENV="production"

ENV IS_DOCKER=1

# Build the application (increased heap for ARM/QEMU builds)
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN cd apps/start && pnpm run build
ENV NODE_OPTIONS=""

# Inject PostHog chunk IDs into source maps (required for source map uploads to work)
# This only adds metadata - actual upload happens at runtime if PostHog env vars are set
RUN npm install -g @posthog/cli && \
    posthog-cli sourcemap inject --directory ./apps/start/.output/public --project sayr-start || \
    echo "⚠️ Source map injection skipped (non-fatal)"

FROM base AS runner
WORKDIR /app

# Install PostHog CLI for runtime source map uploads (before switching to non-root user)
RUN npm install -g @posthog/cli

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
ENV SAYR_EDITION_BAKED=""
ENV APP_ENV="production"
ENV VITE_APP_VERSION=""

# PostHog source map upload env vars (optional - for readable error stack traces)
# Uses VITE_PUBLIC_POSTHOG_HOST for the API host
ENV POSTHOG_CLI_TOKEN=""
ENV POSTHOG_CLI_ENV_ID=""

# Copy entrypoint script
COPY --from=builder --chown=reactjs:nodejs /app/apps/start/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Copy necessary files
# TanStack Start / Nitro outputs to .output
COPY --from=installer --chown=reactjs:nodejs /app/apps/start/.output ./.output

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
