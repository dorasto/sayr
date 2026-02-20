---
title: Caddy Reverse Proxy
description: Set up the Caddy reverse proxy to route traffic to your Sayr deployment
---

Sayr uses [Caddy](https://caddyserver.com/) as a reverse proxy for TLS termination, wildcard subdomain routing, and path-based routing to the correct backend services. Caddy runs on a **separate server** from the main application stack.

## Architecture

```
                    Internet
                       |
              [Caddy VPS :443]
                       |
           ┌───────────┼───────────┐
           |           |           |
    sayr.dev      api.sayr.dev   *.sayr.dev
   (marketing)    (backend)    (start + backend)
           |           |           |
           └───────────┼───────────┘
                       |
              [Coolify Server]
            start    :3000
            backend  :5468
            marketing:8080
```

Caddy handles:
- **Root domain** (`sayr.dev`) — serves the marketing site
- **API subdomain** (`api.sayr.dev`) — proxies to the backend with `/api/public` rewrite
- **Wildcard subdomains** (`*.sayr.dev`) — routes to the start app (frontend) or backend depending on the path
- **Wildcard TLS certificates** via Cloudflare DNS challenge

## Prerequisites

- A VPS or server for Caddy (separate from your Coolify/app server)
- Docker and Docker Compose installed on the Caddy server
- A domain managed by Cloudflare (for DNS challenge wildcard certs)
- A Cloudflare API token with **Zone:DNS:Edit** permission
- Your Coolify server's IP address, with ports `3000`, `5468`, and `8080` accessible from the Caddy server

## Step 1: Build the Caddy image

The Caddy image is built separately from the main app stack. Trigger the **Build Caddy** workflow from the GitHub Actions tab:

1. Go to **Actions** > **Build Caddy**
2. Click **Run workflow**
3. Optionally set a custom tag (defaults to `latest`)

This builds a custom Caddy binary with the [Cloudflare DNS plugin](https://github.com/caddy-dns/cloudflare) and pushes it to `ghcr.io/dorasto/sayr-caddy`.

:::tip
You only need to rebuild the Caddy image when the Caddyfile routing rules change or you want to update the Caddy version. It does not need to be rebuilt on every app deploy.
:::

## Step 2: Create the Cloudflare API token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit zone DNS** template, or create a custom token with:
   - **Permissions**: Zone > DNS > Edit
   - **Zone Resources**: Include your domain (e.g., `sayr.dev`)
4. Copy the token

## Step 3: Deploy Caddy on your proxy server

SSH into your Caddy VPS and create a directory for the deployment:

```bash
mkdir -p ~/sayr-caddy && cd ~/sayr-caddy
```

Create a `docker-compose.yml`:

```yaml
services:
  caddy:
    container_name: sayr-caddy
    image: ghcr.io/dorasto/sayr-caddy:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy_data:/data
      - caddy_config:/config
    environment:
      - ROOT_DOMAIN=${ROOT_DOMAIN}
      - UPSTREAM_HOST=${UPSTREAM_HOST}
      - START_PORT=${START_PORT:-3000}
      - BACKEND_PORT=${BACKEND_PORT:-5468}
      - MARKETING_PORT=${MARKETING_PORT:-8080}
      - ACME_EMAIL=${ACME_EMAIL}
      - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}

volumes:
  caddy_data:
    driver: local
  caddy_config:
    driver: local
```

Create a `.env` file alongside it:

```bash
ROOT_DOMAIN=sayr.dev
UPSTREAM_HOST=<your-coolify-server-ip>
ACME_EMAIL=you@example.com
CLOUDFLARE_API_TOKEN=<your-cloudflare-token>
```

Start the container:

```bash
docker compose up -d
```

## Step 4: Configure DNS

In Cloudflare, set up the following DNS records pointing to your **Caddy VPS** IP:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | Caddy VPS IP | Off (DNS only) |
| A | `*` | Caddy VPS IP | Off (DNS only) |

:::caution
Cloudflare proxy (orange cloud) must be **off** for these records. Caddy handles TLS itself via the DNS challenge. If Cloudflare proxy is on, it will conflict with Caddy's certificate management.
:::

## Step 5: Verify

Once Caddy starts, it will automatically obtain wildcard TLS certificates from Let's Encrypt using the Cloudflare DNS challenge. Check the logs:

```bash
docker compose logs -f caddy
```

You should see certificate issuance messages. Then verify your routes:

- `https://yourdomain.com` — marketing site
- `https://admin.yourdomain.com` — start app (admin dashboard)
- `https://api.yourdomain.com` — backend API (with `/api/public` rewrite)
- `https://orgname.yourdomain.com` — start app (org-scoped)

## Routing rules

### Root domain (`sayr.dev`)

| Path | Destination |
|------|-------------|
| `/admin*` | Redirects to `admin.sayr.dev` |
| `/login` | Redirects to `admin.sayr.dev/login` |
| `/api/*` | Backend (`:5468`) |
| Everything else | Marketing (`:8080`) |

### API subdomain (`api.sayr.dev`)

| Path | Destination |
|------|-------------|
| `/ws`, `/ws/*` | Backend (`:5468`) — no rewrite |
| `/api/health` | Backend (`:5468`) — no rewrite |
| `/` | Rewritten to `/api/public`, then Backend |
| Everything else | Prefixed with `/api/public`, then Backend |

### Wildcard subdomains (`*.sayr.dev`)

| Path | Destination |
|------|-------------|
| `/api/auth/*` | Start (`:3000`) — Better Auth |
| `/api/image-preview/*` | Start (`:3000`) |
| `/api/traces/*` | Start (`:3000`) — OpenTelemetry |
| `/api/*` | Backend (`:5468`) |
| `/ws`, `/ws/*` | Backend (`:5468`) — WebSocket |
| Everything else | Start (`:3000`) |

## Environment variables reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ROOT_DOMAIN` | Yes | — | Your root domain (e.g., `sayr.dev`) |
| `UPSTREAM_HOST` | Yes | — | IP or hostname of the Coolify server |
| `ACME_EMAIL` | Yes | — | Email for Let's Encrypt registration |
| `CLOUDFLARE_API_TOKEN` | Yes | — | Cloudflare token with Zone:DNS:Edit |
| `START_PORT` | No | `3000` | Frontend app port on upstream |
| `BACKEND_PORT` | No | `5468` | Backend API port on upstream |
| `MARKETING_PORT` | No | `8080` | Marketing site port on upstream |

## Updating

To pull a new Caddy image after rebuilding:

```bash
docker compose pull && docker compose up -d
```

Caddy persists TLS certificates and ACME state in the `caddy_data` volume, so restarts and updates do not re-issue certificates.

## Troubleshooting

### Certificate errors

- Confirm the Cloudflare API token has **Zone:DNS:Edit** permission for your domain
- Confirm Cloudflare proxy (orange cloud) is **off** for your DNS records
- Check `docker compose logs caddy` for ACME errors

### 502 Bad Gateway

- Verify the `UPSTREAM_HOST` is reachable from the Caddy VPS
- Verify ports `3000`, `5468`, and `8080` are open on the Coolify server's firewall
- Check that the app containers are running on the Coolify server

### Subdomain not resolving

- Ensure the wildcard DNS record (`*`) points to the Caddy VPS
- Allow a few minutes for DNS propagation
