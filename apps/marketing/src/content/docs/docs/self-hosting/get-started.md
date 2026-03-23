---
title: Get Started
description: Deploy Sayr on your own infrastructure with Docker Compose
sidebar:
  order: 0
---

This guide walks you through deploying a self-hosted Sayr instance using Docker Compose. By the end, you'll have a fully functional project management platform running on your own infrastructure.

## Prerequisites

Before you begin, make sure you have the following ready:

- **Docker** and **Docker Compose** installed on your server
- A **PostgreSQL** database (v15+ recommended)
- An **S3-compatible object store** (MinIO, AWS S3, Cloudflare R2, etc.) for file uploads
- A **domain name** with DNS configured (Sayr uses subdomains for routing)
- A **GitHub OAuth App** for user authentication (optional but recommended)

## Architecture

A self-hosted Sayr instance runs four containers behind a reverse proxy:

| Container | Purpose | Image |
|---|---|---|
| **start** | Frontend application (TanStack Start) | `ghcr.io/dorasto/sayr-ce-start` |
| **backend** | API server (Hono on Bun) | `ghcr.io/dorasto/sayr-ce-backend` |
| **worker** | Background job processor (GitHub webhooks) | `ghcr.io/dorasto/sayr-ce-worker` |
| **nginx** | Reverse proxy and subdomain routing | Built from included config |

Redis is also included for the job queue.

### Subdomain Routing

Sayr uses subdomains to separate concerns. If your domain is `sayr.example.com`:

| Subdomain | Routes to | Purpose |
|---|---|---|
| `sayr.example.com` | start | Public-facing pages |
| `admin.sayr.example.com` | start | Admin dashboard and app UI |
| `api.sayr.example.com` | backend | Public API and SSE |

The nginx container handles all of this routing automatically based on your `VITE_ROOT_DOMAIN` setting.

## Step 1: Get the Compose File

Create a directory for your Sayr deployment and download the compose file:

```bash
mkdir sayr && cd sayr
curl -O https://raw.githubusercontent.com/dorasto/sayr/main/docker/self-host/compose.yml
```

## Step 2: Configure Environment Variables

Create a `.env` file in the same directory as your compose file. Below is a reference of all required variables.

### Core Configuration

```bash
# Your root domain (subdomains are derived from this)
VITE_ROOT_DOMAIN=sayr.example.com

# Full URL to the admin panel
VITE_URL_ROOT=https://admin.sayr.example.com

# Display name for your instance
VITE_PROJECT_NAME=Sayr

# Runtime environment
APP_ENV=production
```

### Database

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/sayr
```

### Storage (S3-compatible)

Sayr stores file uploads (avatars, attachments) in an S3-compatible object store. MinIO is a popular self-hosted option.

```bash
STORAGE_URL=https://s3.example.com
STORAGE_BUCKET=sayr
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key
STORAGE_PORT=443

# Salt used for obfuscating uploaded file names
FILE_SALT=generate-a-random-string-here

# Public URL where uploaded files can be accessed
FILE_CDN=https://cdn.example.com/sayr

# Length of the hash used in file names (default works for most setups)
FILE_NAME_HASH_LENGTH=16
```

### Authentication

Sayr uses [Better Auth](https://www.better-auth.com/) for authentication. You need to provide a secret for session signing.

```bash
# A random secret for signing auth sessions (generate with: openssl rand -hex 32)
BETTER_AUTH_SECRET=your-random-secret-here
```

### GitHub Integration (Optional)

To enable GitHub login and the GitHub integration (linking repos, syncing issues), you need both a GitHub OAuth App and a GitHub App.

**GitHub OAuth App** (for user login):

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set the callback URL to `https://admin.sayr.example.com/api/auth/callback/github`

```bash
GITHUB_CLIENT_ID=your-oauth-client-id
GITHUB_CLIENT_SECRET=your-oauth-client-secret
```

**GitHub App** (for repository integration):

1. Go to [GitHub App Settings](https://github.com/settings/apps)
2. Create a new GitHub App with repository permissions for issues, pull requests, and webhooks
3. Set the webhook URL to `https://api.sayr.example.com/api/internal/v1/github/webhook`

```bash
GITHUB_APP_ID=your-app-id
GITHUB_APP_PRIVATE_KEY=your-private-key
GITHUB_WEBHOOK_SECRET=your-webhook-secret
VITE_GITHUB_APP_NAME=your-github-app-name
```

### Internal

```bash
# Secret for internal service-to-service communication (generate with: openssl rand -hex 32)
INTERNAL_SECRET=your-internal-secret

# Email address used for system notifications
SAYR_EMAIL=admin@example.com

# Job queue mode (redis is recommended for production)
QUEUE_MODE=redis
```

### Doras OAuth (Optional)

Doras is the OAuth provider used by the hosted Sayr Cloud. For self-hosted instances, this is optional -- you can skip it and use GitHub login instead.

```bash
DORAS_CLIENT_ID=
DORAS_CLIENT_SECRET=
DORAS_ORGANIZATION=
```

### Observability (Optional)

These are only needed if you use Axiom for log aggregation. Self-hosted instances log to the console by default.

```bash
AXIOM_OTEL_TOKEN=
AXIOM_OTEL_DATASET=
AXIOM_OTEL_DOMAIN=
```

## Step 3: Set Up the Database

Sayr uses PostgreSQL with Drizzle ORM. Before starting the containers, you need a PostgreSQL database ready and accessible from your server.

Make sure the `DATABASE_URL` in your `.env` file points to your database. Sayr will run migrations automatically on startup.

## Step 4: Set Up the Reverse Proxy

The compose file includes an nginx container that routes traffic to the correct services based on subdomain. It builds from the included Dockerfile and nginx config.

You'll need to get the nginx configuration files:

```bash
mkdir -p apps/nginx
curl -o apps/nginx/Dockerfile https://raw.githubusercontent.com/dorasto/sayr/main/docker/cloud/nginx/Dockerfile
curl -o apps/nginx/nginx.conf.template https://raw.githubusercontent.com/dorasto/sayr/main/docker/cloud/nginx/nginx.conf.template
curl -o apps/nginx/proxy.conf https://raw.githubusercontent.com/dorasto/sayr/main/docker/cloud/nginx/proxy.conf
```

### DNS Configuration

Point the following DNS records to your server:

| Type | Name | Value |
|---|---|---|
| A | `sayr.example.com` | Your server IP |
| A | `admin.sayr.example.com` | Your server IP |
| A | `api.sayr.example.com` | Your server IP |

Alternatively, use a wildcard record:

| Type | Name | Value |
|---|---|---|
| A | `*.sayr.example.com` | Your server IP |

### TLS / HTTPS

The nginx container listens on port 80. For production, you should place it behind a TLS-terminating reverse proxy. Common options:

- **Traefik** -- The compose file includes Traefik labels out of the box. If you're already running Traefik, it should work automatically.
- **Caddy** -- Simple automatic HTTPS. Proxy port 80 on the nginx container.
- **Cloudflare Tunnel** -- Zero-config HTTPS without opening ports.

## Step 5: Start Sayr

```bash
docker compose up -d
```

Check that all containers are running:

```bash
docker compose ps
```

You should see `sayr-start`, `sayr-backend`, `sayr-worker-github`, `sayr-redis`, and the nginx container all in a running state.

## Step 6: First Login

1. Open `https://admin.sayr.example.com` in your browser
2. Sign in with GitHub (or Doras if configured)
3. Create your first organization

That's it -- you're running Sayr.

## Updating

To update to the latest version:

```bash
docker compose pull
docker compose up -d
```

The CE images use the `latest` tag by default, so pulling will always get the newest release.

## Troubleshooting

### Containers won't start

Check the logs for the failing container:

```bash
docker compose logs start
docker compose logs backend
docker compose logs github-worker
```

Common issues:
- **Database connection failed** -- Verify `DATABASE_URL` is correct and the database is reachable from inside Docker
- **Storage connection failed** -- Verify `STORAGE_URL`, access keys, and that the bucket exists

### Can't reach the app

- Verify DNS records point to your server
- Check that nginx is running: `docker compose logs nginx`
- Make sure port 80 (or 3000 if accessing directly) is open
- If using Traefik/Caddy, check that the upstream proxy configuration is correct

### GitHub login not working

- Verify the OAuth callback URL matches exactly: `https://admin.yourdomain.com/api/auth/callback/github`
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct

## What's Next

- Read about [Editions](/docs/self-hosting/editions/) to understand the differences between Community, Cloud, and Enterprise
- The Community Edition is limited to a single organization but has no limits on members, views, templates, teams, or releases
