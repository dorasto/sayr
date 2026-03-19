---
title: Edition & Plan Limits
description: How the edition detection, plan limits, and resource gating system works across backend and frontend
sidebar:
   order: 8
---

This guide explains the internal architecture of Sayr's edition and plan limit system. It covers the `@repo/edition` package, frontend hooks, backend enforcement patterns, and how to add limits to new resources.

## Architecture Overview

The edition system has three layers:

```
┌─────────────────────────────────────────────────────┐
│                     Frontend                         │
│  usePlanLimits() / usePlanLimitsFromData()           │
│  PlanLimitBanner, disabled buttons, tooltips         │
│  Edition from: import.meta.env.VITE_SAYR_EDITION    │
└──────────────────────┬──────────────────────────────┘
                       │ fetch (POST/PATCH)
┌──────────────────────▼──────────────────────────────┐
│                     Backend                          │
│  enforceLimit()  — instance-level (self-hosted)      │
│  canCreateResource() — plan-level (per-org)          │
│  Edition from: process.env / SAYR_EDITION_BAKED      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               @repo/edition                          │
│  Types, constants, pure functions, server wrappers   │
└─────────────────────────────────────────────────────┘
```

The frontend provides optimistic UX (disabling buttons, showing banners) while the backend is the source of truth and enforces limits with 403 responses.

## The `@repo/edition` Package

All edition and limit logic lives in `packages/edition/src/`. It exports both **server-only wrappers** and **pure functions** that are safe for browser use.

### Types (`types.ts`)

```typescript
type Edition = "cloud" | "community" | "enterprise";

interface PlanLimits {
   members: number | null;       // null = unlimited
   savedViews: number | null;
   issueTemplates: number | null;
   teams: number | null;
   releases: number | null;
}

type CloudPlan = "free" | "pro";
type SelfHostedPlan = "self-hosted";
type PlanId = CloudPlan | SelfHostedPlan;
```

### Edition Detection (`edition.ts`)

`getEdition()` resolves the current edition using this priority:

1. `SAYR_EDITION_BAKED` (build-time, Docker images -- cannot be overridden)
2. `SAYR_EDITION` env var (local development)
3. `SAYR_CLOUD=true` legacy fallback
4. Default: `"community"`

This function reads `process.env` and is **server-only**. Never import `getEdition()`, `isCloud()`, `isSelfHosted()`, `isCommunity()`, or `isEnterprise()` in browser code.

### Limit Constants (`capabilities.ts`)

```typescript
// Cloud free plan limits
const FREE_LIMITS: PlanLimits = {
   members: 5, savedViews: 3, issueTemplates: 3, teams: 1, releases: 0,
};

// Cloud pro plan -- effectively unlimited
const CLOUD_PLAN_LIMITS = {
   free: FREE_LIMITS,
   pro: { members: 1000, savedViews: null, issueTemplates: null, teams: null, releases: null },
};

// Self-hosted editions -- unlimited everything
const SELF_HOSTED_LIMITS: PlanLimits = {
   members: 1000, savedViews: null, issueTemplates: null, teams: null, releases: null,
};
```

### Pure Functions (Browser-Safe)

These accept `edition` as a parameter and never touch `process.env`:

| Function | Purpose |
|----------|---------|
| `getLimitsForEdition(edition, plan)` | Get `PlanLimits` for an edition + plan combo |
| `canCreate(edition, resource, currentCount, plan)` | `true` if creation is allowed (count < limit) |
| `isOverLimit(edition, resource, currentCount, plan)` | `true` if count > limit (user must delete to get back under) |
| `getResourceLimitMessage(edition, resource, plan)` | Human-readable upgrade message |
| `formatResourceName(resource)` | `"savedViews"` to `"Saved views"` |

### Server-Only Wrappers

These call `getEdition()` internally and exist for backend convenience:

| Function | Equivalent Pure Call |
|----------|---------------------|
| `getEffectiveLimits(plan)` | `getLimitsForEdition(getEdition(), plan)` |
| `canCreateResource(resource, count, plan)` | `canCreate(getEdition(), resource, count, plan)` |
| `getLimitReachedMessage(resource, plan)` | `getResourceLimitMessage(getEdition(), resource, plan)` |

### Import Rules

```typescript
// Backend (server-side) -- can use anything
import { canCreateResource, getLimitReachedMessage, isCloud } from "@repo/edition";

// Frontend (browser) -- ONLY pure functions and types
import { canCreate, isOverLimit, getLimitsForEdition, getResourceLimitMessage } from "@repo/edition";
import type { Edition, PlanLimits } from "@repo/edition";
```

:::danger
**Never import `getEdition()`, `isCloud()`, `getEffectiveLimits()`, `canCreateResource()`, or `getLimitReachedMessage()` in frontend/browser code.** These call `process.env` which does not exist in the browser. Vite only replaces `import.meta.env.VITE_*` -- anything using `process.env` will silently resolve to `undefined`, causing `getEdition()` to default to `"community"` and all limits to appear unlimited.
:::

## Frontend Hooks

### `usePlanLimits()`

For pages that have the main org layout context (`useLayoutOrganization()`):

```typescript
import { usePlanLimits } from "@/hooks/usePlanLimits";

function MyComponent() {
   const { canCreateResource, isOverLimit, getLimitMessage, limits, counts, isCloud } = usePlanLimits();

   if (!canCreateResource("savedViews")) {
      // Show lock icon or disable button
   }

   if (isOverLimit("savedViews")) {
      // Block editing too (user must delete to get back under)
   }

   const message = getLimitMessage("savedViews");
   // "You've reached the maximum of 3 saved views on the free plan..."
}
```

This hook reads the edition from `import.meta.env.VITE_SAYR_EDITION` and the plan/counts from the org context.

### `usePlanLimitsFromData()`

For settings pages that use `useLayoutOrganizationSettings()` instead of `useLayoutOrganization()`:

```typescript
import { usePlanLimitsFromData } from "@/hooks/usePlanLimits";

function SettingsPage() {
   const { organization, views, issueTemplates, releases } = useLayoutOrganizationSettings();

   const planLimits = usePlanLimitsFromData({
      plan: organization.plan,
      memberCount: organization.members.length,
      viewCount: views.length,
      issueTemplateCount: issueTemplates.length,
      releaseCount: releases.length,
   });

   // Same API as usePlanLimits()
}
```

Both hooks return the same `PlanLimitsReturn` shape:

| Property | Type | Description |
|----------|------|-------------|
| `edition` | `Edition` | Current edition |
| `isCloud` | `boolean` | Whether running on cloud |
| `plan` | `string \| null` | Org's plan (`"free"`, `"pro"`, etc.) |
| `limits` | `PlanLimits` | Resolved limits for this org |
| `counts` | `Record<keyof PlanLimits, number>` | Current resource counts |
| `canCreateResource(resource)` | `(r) => boolean` | Can the org create another of this resource? |
| `isOverLimit(resource)` | `(r) => boolean` | Is the org currently over this limit? |
| `getLimitMessage(resource)` | `(r) => string` | Upgrade message for this resource |

## `PlanLimitBanner` Component

A reusable banner shown when a limit is reached. Matches the visual style of the existing seat limit banner on the members page.

```tsx
import { PlanLimitBanner } from "@/components/generic/PlanLimitBanner";

<PlanLimitBanner
   title="Saved view limit reached"
   description={getLimitMessage("savedViews")}
/>
```

Renders a `Tile` with `border-destructive/30 bg-destructive/5` styling and a lock icon.

## Backend Enforcement

Every creation endpoint uses a two-tier approach:

### Tier 1: Instance-Level (`enforceLimit()`)

```typescript
import { enforceLimit } from "@/util";

const limitRes = await enforceLimit({
   c,
   limitKey: "savedViews",
   table: schema.savedView,
   traceName: "saved_view.count_all",
   entityName: "saved view",
   traceAsync,
   recordWideError,
});
if (limitRes) return limitRes;
```

This counts **all rows** in the table (not per-org) and is designed for self-hosted instance-level caps. On cloud, it returns `undefined` immediately (`isCloud()` early return). Always capture and check the return value.

### Tier 2: Plan-Level (`canCreateResource()`)

```typescript
import { canCreateResource, getLimitReachedMessage } from "@repo/edition";

// Count org-specific resources
const orgViews = await db.query.savedView.findMany({
   where: eq(schema.savedView.organizationId, orgId),
});

if (!canCreateResource("savedViews", orgViews.length, org.plan)) {
   return c.json({
      success: false,
      error: getLimitReachedMessage("savedViews", org.plan),
   }, 403);
}
```

This checks the org's plan-level limit. Active on both cloud and self-hosted.

### PATCH/Edit Over-Limit Checks

When a user's org is **over** the limit (e.g., downgraded from pro to free with 5 views), editing existing items is also blocked. This is checked on PATCH endpoints:

```typescript
import { getEffectiveLimits } from "@repo/edition";

const limits = getEffectiveLimits(org.plan);
if (limits.savedViews !== null) {
   const orgViews = await db.query.savedView.findMany({
      where: eq(schema.savedView.organizationId, orgId),
   });
   if (orgViews.length > limits.savedViews) {
      return c.json({
         success: false,
         error: "You are over the saved view limit. Please delete some views before editing.",
      }, 403);
   }
}
```

## UX Rules for Gating

These rules apply to any resource with plan limits:

### Create

Block entirely when at or over the limit. Replace the create button with a disabled/locked state and tooltip explaining the limit.

```tsx
{canCreateResource("savedViews") ? (
   <CreateButton />
) : (
   <Tooltip content={getLimitMessage("savedViews")}>
      <Button variant="ghost" disabled>
         <IconLock className="size-4" />
      </Button>
   </Tooltip>
)}
```

### Edit

**Never fully block access to the editor.** Users must always be able to open the edit sheet/dialog (so they can delete items to get back under the limit). Instead, disable the **Save** button inside the editor when over limit.

```tsx
<Button
   disabled={isOverLimit("savedViews")}
   onClick={handleSave}
>
   Save
</Button>
{isOverLimit("savedViews") && (
   <p className="text-destructive text-xs">
      You are over the saved view limit. Delete some views before editing.
   </p>
)}
```

### Delete

Always allowed, regardless of limits.

### Summary Table

| Action | At limit (count = max) | Over limit (count > max) |
|--------|----------------------|------------------------|
| Create | Blocked | Blocked |
| Edit (open editor) | Allowed | Allowed |
| Edit (save changes) | Allowed | Blocked |
| Delete | Allowed | Allowed |

## Adding Limits to a New Resource

Follow these steps to add plan-based limits to a new resource type.

### 1. Add to `PlanLimits` type

```typescript
// packages/edition/src/types.ts
export interface PlanLimits {
   // ...existing fields
   myNewResource: number | null;
}
```

### 2. Set limits in constants

```typescript
// packages/edition/src/capabilities.ts
export const CLOUD_PLAN_LIMITS = {
   free: { ...existing, myNewResource: 3 },
   pro: { ...existing, myNewResource: null },
};

export const SELF_HOSTED_LIMITS = { ...existing, myNewResource: null };
export const FREE_LIMITS = { ...existing, myNewResource: 3 };
```

### 3. Add to `formatResourceName()`

```typescript
case "myNewResource":
   return "My new resources";
```

### 4. Add count to frontend hooks

In `usePlanLimits.ts`, add the count to the `counts` object in `buildPlanLimits()`:

```typescript
const counts: Record<keyof PlanLimits, number> = {
   // ...existing
   myNewResource: data.myNewResourceCount,
};
```

Update both `usePlanLimits()` and `usePlanLimitsFromData()` to accept/derive the count.

### 5. Add backend enforcement

In the POST creation endpoint:

```typescript
// Tier 1: instance-level (self-hosted)
const limitRes = await enforceLimit({
   c, limitKey: "myNewResource", table: schema.myNewResource,
   traceName: "my_new_resource.count_all", entityName: "resource",
   traceAsync, recordWideError,
});
if (limitRes) return limitRes;

// Tier 2: plan-level (per-org)
const orgResources = await db.query.myNewResource.findMany({
   where: eq(schema.myNewResource.organizationId, orgId),
});
if (!canCreateResource("myNewResource", orgResources.length, org.plan)) {
   return c.json({
      success: false,
      error: getLimitReachedMessage("myNewResource", org.plan),
   }, 403);
}
```

In the PATCH edit endpoint, add an over-limit check using `getEffectiveLimits()`.

### 6. Add frontend gating

Use `usePlanLimits()` or `usePlanLimitsFromData()` in the relevant page components. Follow the UX rules above for create/edit/delete gating. Add `PlanLimitBanner` where appropriate.

## File Reference

| File | Purpose |
|------|---------|
| `packages/edition/src/types.ts` | `Edition`, `PlanLimits`, `PlanId` types |
| `packages/edition/src/edition.ts` | `getEdition()` and boolean helpers (server-only) |
| `packages/edition/src/capabilities.ts` | Limit constants, pure functions, server wrappers |
| `packages/edition/src/index.ts` | Re-exports everything |
| `apps/start/src/hooks/usePlanLimits.ts` | `usePlanLimits()` and `usePlanLimitsFromData()` hooks |
| `apps/start/src/components/generic/PlanLimitBanner.tsx` | Reusable limit banner component |
| `apps/backend/util.ts` | `enforceLimit()` instance-level utility |
| `apps/backend/routes/api/internal/v1/organization.ts` | Enforcement for views, templates, members, teams |
| `apps/backend/routes/api/internal/v1/release.ts` | Enforcement for releases |

## Related Guides

- [Editions](/docs/self-hosting/editions) -- User-facing edition overview and Cloud plan limits
- [Architecture Overview](/docs/contributing/architecture) -- How the systems connect
- [Adding Features](/docs/contributing/adding-features) -- End-to-end feature implementation walkthrough
