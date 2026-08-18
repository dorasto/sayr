---
name: edition
description: Work with the Sayr edition system (cloud, community, enterprise) including limits, capabilities, and edition-aware code
metadata:
  audience: developers
  workflow: feature-development
---

## What I do

I help you work with the `@repo/edition` package -- the single source of truth for what edition of Sayr is running (cloud, community, enterprise) and what capabilities/limits are available. This includes adding new capabilities, enforcing resource limits, making UI edition-aware, and configuring Docker builds.

## Architecture overview

Sayr ships in three editions:

| Edition | Description | How it runs |
|---------|-------------|-------------|
| `cloud` | Hosted SaaS at sayr.io | `sayr-{start,backend,worker,marketing}` Docker images (private) |
| `community` | Free self-hosted (CE) | `sayr-ce-{start,backend,worker}` Docker images (public) |
| `enterprise` | Licensed self-hosted | Same CE images + `SAYR_LICENSE_KEY` env var |

**Key design principles:**
- Edition is **baked at Docker build time** via `SAYR_EDITION_BAKED` -- CE images cannot be switched to cloud mode at runtime
- Enterprise is NOT a separate image -- it upgrades community images when a valid license key is detected
- In local dev, `SAYR_EDITION` env var controls the edition (no baked value)
- `@repo/edition` is used by both frontend and backend

### Edition detection priority chain

```
1. SAYR_EDITION_BAKED (build-time, Docker only)
   ├── "cloud" → cloud
   └── "community" + valid license → enterprise
   └── "community" (no license) → community
2. SAYR_EDITION env var (local dev)
3. SAYR_CLOUD=true (legacy compat → cloud)
4. Default → community
```

### Key files

| File | Purpose |
|------|---------|
| `packages/edition/src/types.ts` | `Edition`, `PlanLimits`, `EditionCapabilities`, `PlanId` types |
| `packages/edition/src/edition.ts` | `getEdition()`, `isCloud()`, `isSelfHosted()`, `isCommunity()`, `isEnterprise()` |
| `packages/edition/src/capabilities.ts` | `getEditionCapabilities()`, `getEffectiveLimits()`, `canCreateResource()`, `getLimitReachedMessage()` |
| `packages/edition/src/index.ts` | Barrel exports |
| `apps/start/vite.config.ts` | Bakes `VITE_SAYR_EDITION` into frontend via `define` block |
| `apps/backend/Dockerfile` | `ARG SAYR_EDITION_BAKED` before build step |
| `apps/start/Dockerfile` | `ARG SAYR_EDITION_BAKED` before build step |
| `apps/worker/Dockerfile` | `ARG SAYR_EDITION_BAKED` before build step |
| `.github/workflows/build-and-deploy.yml` | `edition: [cloud, ce]` matrix dimension |

### Integration points (where edition is checked)

| File | What it checks |
|------|---------------|
| `apps/backend/routes/api/internal/v1/organization.ts` | Org creation limit, saved view limit, issue template limit, team limit |
| `apps/backend/routes/api/internal/v1/release.ts` | Release creation limit |
| `packages/opentelemetry/src/index.ts` | `axiomTelemetryEnabled` for telemetry output |
| `apps/start/src/routes/orgs/$orgSlug/route.tsx` | `multiTenantEnabled` for public org resolution |
| `apps/start/src/lib/routemap.ts` | Filters `cloudOnly` nav items from settings sidebar |
| `apps/start/src/routes/(admin)/settings/org/$orgId/billing/index.tsx` | Redirects non-cloud to general settings |
| `apps/start/src/components/admin/sidebars/user-dropdown.tsx` | Edition label display, hide billing on CE |
| `apps/start/src/components/organization/CreateOrganizationDialog.tsx` | Returns null on CE when user has >= 1 org |
| `packages/auth/src/index.ts` | First-user auto-admin on self-hosted editions |

## API reference

### Edition detection (`edition.ts`)

```typescript
import { getEdition, isCloud, isSelfHosted, isCommunity, isEnterprise } from "@repo/edition";

getEdition();     // "cloud" | "community" | "enterprise"
isCloud();        // true only on cloud
isSelfHosted();   // true on community OR enterprise
isCommunity();    // true only on community
isEnterprise();   // true only on enterprise
```

### Capabilities (`capabilities.ts`)

```typescript
import { getEditionCapabilities, getEffectiveLimits, canCreateResource, getLimitReachedMessage } from "@repo/edition";

// Instance-wide capabilities (not per-org)
const caps = getEditionCapabilities();
caps.maxOrganizations;      // number | null (null = unlimited)
caps.polarBillingEnabled;   // boolean
caps.dorasOAuthEnabled;     // boolean
caps.axiomTelemetryEnabled; // boolean
caps.marketingSiteEnabled;  // boolean
caps.multiTenantEnabled;    // boolean

// Per-org limits based on edition + plan
const limits = getEffectiveLimits("free");  // pass org.plan
limits.members;          // number | null
limits.savedViews;       // number | null
limits.issueTemplates;   // number | null
limits.teams;            // number | null
limits.releases;         // number | null

// Check if a resource can be created
canCreateResource("savedViews", currentCount, org.plan); // boolean

// Human-readable error message
getLimitReachedMessage("teams", org.plan); // "You've reached the maximum..."
```

### Types (`types.ts`)

```typescript
import type { Edition, PlanLimits, EditionCapabilities, CloudPlan, SelfHostedPlan, PlanId } from "@repo/edition";

type Edition = "cloud" | "community" | "enterprise";
type CloudPlan = "free" | "pro";
type SelfHostedPlan = "self-hosted";
type PlanId = CloudPlan | SelfHostedPlan;
```

## Usage patterns

### Pattern 1: Backend resource limit enforcement

Every resource creation endpoint follows this pattern. Fetch the org with plan data, count existing resources, check limits.

```typescript
// In a Hono route handler
import { canCreateResource, getLimitReachedMessage } from "@repo/edition";
import { count, eq, and } from "drizzle-orm";

// 1. Fetch org with plan
const org = await db.query.organization.findFirst({
   where: eq(schema.organization.id, orgId),
   columns: { id: true, plan: true },
});

// 2. Count existing resources (exclude system resources if applicable)
const [{ count: existingCount }] = await db
   .select({ count: count() })
   .from(schema.myResource)
   .where(eq(schema.myResource.organizationId, orgId));

// 3. Check limit
if (!canCreateResource("myResource", existingCount, org.plan)) {
   return c.json({
      success: false,
      error: getLimitReachedMessage("myResource", org.plan),
   }, 403);
}
```

### Pattern 2: Backend edition capability check

For instance-level capabilities (not per-org), use `getEditionCapabilities()`.

```typescript
import { getEditionCapabilities } from "@repo/edition";

const caps = getEditionCapabilities();

// Example: org creation limit
if (caps.maxOrganizations !== null && userOrgCount >= caps.maxOrganizations) {
   return c.json({ success: false, error: "Organization limit reached" }, 403);
}
```

### Pattern 3: Frontend conditional rendering (server-side)

For backend/server functions, import directly from `@repo/edition`.

```typescript
import { isCloud, getEditionCapabilities } from "@repo/edition";

// In a TanStack Start loader or server function
if (!isCloud()) {
   throw redirect({ to: "/settings/org/$orgId", params: { orgId } });
}
```

### Pattern 4: Frontend conditional rendering (client-side)

On the client, read the build-time baked value from `import.meta.env.VITE_SAYR_EDITION`.

```typescript
// Client-side component
const editionRaw = import.meta.env.VITE_SAYR_EDITION as string | undefined;

// Hide billing on non-cloud
{editionRaw === "cloud" && <BillingMenuItem />}

// Show edition label
const editionLabel = editionRaw === "cloud" ? "Cloud"
   : editionRaw === "enterprise" ? "Enterprise"
   : "Community";
```

Do NOT import `@repo/edition` in client components -- it uses `process.env` which is server-only. Use the Vite env var instead.

### Pattern 5: Hide navigation items by edition

Add `cloudOnly: true` to nav entries in `routemap.ts` and filter them.

```typescript
// In routemap.ts
{ name: "Billing", to: "/billing", icon: IconCreditCard, cloudOnly: true },

// Filter
export const orgSettingsNavigation = allNavItems.filter((item) => {
   if (item.cloudOnly && !isCloud()) return false;
   return true;
});
```

### Pattern 6: Dockerfile baking

Each Dockerfile uses `ARG/ENV SAYR_EDITION_BAKED` in the installer stage before `pnpm build`:

```dockerfile
# In the installer stage (before build)
ARG SAYR_EDITION_BAKED="community"
ENV SAYR_EDITION_BAKED=${SAYR_EDITION_BAKED}

RUN pnpm build  # Edition is baked into the JS bundle here
```

The CI workflow passes the appropriate value:
- Cloud builds: `SAYR_EDITION_BAKED=cloud`
- CE builds: `SAYR_EDITION_BAKED=community`

### Pattern 7: Adding a new edition capability

1. Add the field to `EditionCapabilities` in `types.ts`
2. Set values for all three editions in `EDITION_CAPABILITIES` in `capabilities.ts`
3. Use it via `getEditionCapabilities().myNewCapability`

### Pattern 8: Adding a new resource limit

1. Add the field to `PlanLimits` in `types.ts`
2. Set values in `CLOUD_PLAN_LIMITS`, `SELF_HOSTED_LIMITS`, and `FREE_LIMITS` in `capabilities.ts`
3. Add backend enforcement in the creation endpoint using `canCreateResource()`
4. Optionally update frontend billing display

## Limits reference

### Edition capabilities (instance-level)

| Capability | Cloud | Community | Enterprise |
|-----------|-------|-----------|------------|
| `maxOrganizations` | unlimited | 1 | unlimited |
| `polarBillingEnabled` | true | false | false |
| `dorasOAuthEnabled` | true | false | false |
| `axiomTelemetryEnabled` | true | false | false |
| `marketingSiteEnabled` | true | false | false |
| `multiTenantEnabled` | true | false | false |

### Plan limits (per-org)

| Resource | Cloud Free | Cloud Pro | Self-Hosted (CE/Enterprise) |
|----------|-----------|-----------|----------------------------|
| `members` | 5 | 1000 | 1000 |
| `savedViews` | 3 | unlimited | unlimited |
| `issueTemplates` | 3 | unlimited | unlimited |
| `teams` | 1 | unlimited | unlimited |
| `releases` | 0 | unlimited | unlimited |

## Dev scripts

```bash
pnpm dev:ce      # Run locally as community edition
pnpm dev:ce:op   # Same, with 1Password secret injection
pnpm dev:cloud   # Run locally as cloud edition
pnpm dev:cloud:op # Same, with 1Password secret injection
```

These use `cross-env` to set `SAYR_EDITION` and `VITE_SAYR_EDITION`, passed through by `turbo.json`'s `globalPassThroughEnv`.

## Rules

1. **Never import `@repo/edition` in client-side React components** -- it uses `process.env`. Use `import.meta.env.VITE_SAYR_EDITION` instead.
2. **Server-side code** (backend, loaders, server functions) should import from `@repo/edition` directly.
3. **Resource limits are always checked server-side** -- frontend checks are for UX only (hiding buttons), never for enforcement.
4. **Self-hosted editions get unlimited resources** -- only edition-level capabilities (like max orgs) are restricted on CE.
5. **Enterprise uses community images** -- never create separate enterprise Docker images.
6. **The `SAYR_EDITION_BAKED` build arg must appear BEFORE `pnpm build`** in Dockerfiles so it's compiled into the bundle.
7. **`null` means unlimited** in both `PlanLimits` and `EditionCapabilities`.
8. **Exclude system resources from counts** -- e.g., system teams (`isSystem: true`) should not count toward the team limit.
9. **Always add the `@repo/edition` dependency** to `package.json` of any app/package that imports from it.

## When to use me

Use this skill when:
- Adding a new edition capability or resource limit
- Making a UI component or page edition-aware (show/hide based on cloud vs CE)
- Adding backend enforcement for a new resource type
- Modifying Docker builds to bake edition values
- Working with the CI build matrix (cloud vs CE images)
- Understanding how edition detection works
- Adding dev scripts for edition-specific development
- Working on the enterprise license key system

## What I need from you

Tell me:
1. **What you're doing** -- Adding a limit? Making UI edition-aware? Modifying capabilities?
2. **Which edition(s)** -- Does this affect cloud, CE, enterprise, or all?
3. **Server or client** -- Is the code running on the server (backend/loader) or client (React component)?
4. **Resource details** -- If adding a limit: which resource, what counts, what are the limits per plan?
