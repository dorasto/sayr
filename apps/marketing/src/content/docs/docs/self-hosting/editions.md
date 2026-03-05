---
title: Editions
description: Understanding Sayr's edition system - Community, Cloud, and Enterprise
---

Sayr ships in three editions. Each edition targets a different deployment scenario and determines what capabilities and limits are available on your instance.

## Edition Overview

| | Community (CE) | Cloud | Enterprise |
|---|---|---|---|
| **For** | Self-hosted, free | Hosted at sayr.io | Self-hosted, licensed |
| **Cost** | Free | Free & Pro tiers | License required |
| **Organizations** | 1 | Unlimited | Unlimited |
| **Members** | Unlimited | Plan-based | Unlimited |
| **Views, templates, teams, releases** | Unlimited | Plan-based | Unlimited |
| **Multi-tenant public pages** | No (system org only) | Yes | No |
| **Polar billing** | No | Yes | No |
| **Axiom telemetry** | No | Yes | No |

## Community Edition (CE)

The Community Edition is for self-hosters who want to run Sayr for free. It includes all core project management features with no per-resource limits, but is restricted to a single organization.

### Docker Images

CE images are published separately from the Cloud images:

- `ghcr.io/dorasto/sayr-ce-start` -- Frontend application
- `ghcr.io/dorasto/sayr-ce-backend` -- API server
- `ghcr.io/dorasto/sayr-ce-worker` -- Background job processor

The edition is baked into the Docker image at build time. CE images always run in community mode -- this cannot be overridden with environment variables.

### What's Included

- Unlimited members, saved views, issue templates, teams, and releases
- Single organization per instance
- GitHub integration (requires your own GitHub App)
- All task management features (statuses, priorities, labels, categories, assignments)
- Public pages (resolves to your system organization)

### What's Not Included

- Polar-based billing and subscription management
- Doras OAuth provider
- Axiom-based telemetry (uses console output instead)
- Multi-tenant public page resolution
- Marketing site

## Cloud

Cloud is the hosted edition running at [sayr.io](https://sayr.io). It uses plan-based limits per organization.

### Free Plan Limits

| Resource | Limit |
|---|---|
| Members | 5 |
| Saved views | 3 |
| Issue templates | 3 |
| Teams | 1 |
| Releases | Not available |

### Pro Plan

All resources are unlimited on the Pro plan. Upgrade through the billing settings in your organization.

## Enterprise Edition

:::note
Enterprise edition is not yet available. It will be released as a licensed self-hosted option with expanded capabilities beyond the Community Edition.
:::

Enterprise will allow self-hosted instances to support multiple organizations by validating a license key. The license will be available as a product through Polar.

## How Edition Detection Works

Sayr determines its edition using this priority:

1. **Build-time baked value** (`SAYR_EDITION_BAKED`) -- Set during Docker image builds. Cannot be overridden at runtime. This is how CE and Cloud images are locked to their respective editions.
2. **`SAYR_EDITION` environment variable** -- Used in local development. Set to `cloud`, `community`, or `enterprise`.
3. **Legacy `SAYR_CLOUD` fallback** -- If `SAYR_CLOUD=true`, the instance runs in cloud mode. This is deprecated in favor of `SAYR_EDITION`.
4. **Default** -- If nothing is set, defaults to `community`.

### Local Development

When running Sayr locally with `pnpm dev`, set the edition via environment variable:

```bash
# Run as community edition (default)
SAYR_EDITION=community pnpm dev

# Run as cloud edition (for cloud development)
SAYR_EDITION=cloud pnpm dev
```

Or add `SAYR_EDITION=community` to your `.env` file.

## Resource Limit Enforcement

On Cloud, resource limits are enforced server-side. When a limit is reached, the API returns a `403` response with a message explaining the limit and suggesting an upgrade.

Limits are checked when creating:
- **Organizations** -- Edition-level limit (CE: 1, Cloud/Enterprise: unlimited)
- **Saved views** -- Plan-level limit per organization
- **Issue templates** -- Plan-level limit per organization
- **Teams** -- Plan-level limit per organization (system teams are excluded from the count)
- **Releases** -- Plan-level limit per organization

On self-hosted editions (Community and Enterprise), all per-resource limits are unlimited. The only restriction on Community is the single-organization limit.
