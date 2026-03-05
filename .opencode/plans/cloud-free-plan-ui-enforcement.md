# Cloud Free Plan UI Enforcement

## Summary

Implement proactive UI enforcement for cloud free plan resource limits (saved views, issue templates, releases). Currently the backend rejects requests with 403, but the frontend has zero pre-checks — users see generic error toasts. This plan adds frontend gating, upgrade prompts, and backend edit-endpoint enforcement.

## Rules

| Resource | Free Limit | Create | Edit | Delete | Existing items |
|----------|-----------|--------|------|--------|---------------|
| Saved views | 3 | Block at >= 3 | Block if over limit (> 3) | Always allowed | Visible but locked |
| Issue templates | 3 | Block at >= 3 | Block if over limit (> 3) | Always allowed | Visible but locked |
| Releases | 0 (disabled) | Always block | Always allowed | Always allowed | Leave alone |

---

## Phase 0: Make @repo/edition client-safe

**Problem**: `getEffectiveLimits()`, `canCreateResource()`, and `getLimitReachedMessage()` all call `getEdition()` which uses `process.env` — unusable in the browser.

**Solution**: Add **pure functions** that accept `edition` as a parameter. Existing server-side functions become thin wrappers.

### Changes to `packages/edition/src/capabilities.ts`

1. Export `CLOUD_PLAN_LIMITS`, `SELF_HOSTED_LIMITS`, `FREE_LIMITS` as named exports (make `const` → `export const`)
2. Add new pure functions:
   - `getLimitsForEdition(edition: Edition, plan: string | null | undefined): PlanLimits`
   - `canCreate(edition: Edition, resource: keyof PlanLimits, currentCount: number, plan: string | null | undefined): boolean`
   - `isOverLimit(edition: Edition, resource: keyof PlanLimits, currentCount: number, plan: string | null | undefined): boolean`
   - `getResourceLimitMessage(edition: Edition, resource: keyof PlanLimits, plan: string | null | undefined): string`
3. Refactor existing server-side functions as thin wrappers:
   - `getEffectiveLimits(plan)` → calls `getLimitsForEdition(getEdition(), plan)`
   - `canCreateResource(resource, count, plan)` → calls `canCreate(getEdition(), resource, count, plan)`
   - `getLimitReachedMessage(resource, plan)` → calls `getResourceLimitMessage(getEdition(), resource, plan)`
4. Export `formatResourceName` (currently private, useful for UI)

### Changes to `packages/edition/src/index.ts`

Add exports for new pure functions:
```typescript
export {
  getLimitsForEdition,
  canCreate,
  isOverLimit,
  getResourceLimitMessage,
  formatResourceName,
  CLOUD_PLAN_LIMITS,
  SELF_HOSTED_LIMITS,
  FREE_LIMITS,
} from "./capabilities";
```

---

## Phase 1: Shared frontend hook + component

### New: `apps/start/src/hooks/usePlanLimits.ts`

```typescript
import { type Edition, type PlanLimits, getLimitsForEdition, canCreate, isOverLimit, getResourceLimitMessage } from "@repo/edition";
import { useLayoutOrganization } from "@/contexts/ContextOrg";

export function usePlanLimits() {
  const edition = (import.meta.env.VITE_SAYR_EDITION ?? "community") as Edition;
  const { organization, views, issueTemplates, releases } = useLayoutOrganization();
  const plan = organization.plan;
  const limits = getLimitsForEdition(edition, plan);
  const isCloudEdition = edition === "cloud";

  const counts: Record<keyof PlanLimits, number> = {
    members: organization.members.length,
    savedViews: views.length,
    issueTemplates: issueTemplates.length,
    teams: 0, // not tracked in org context currently
    releases: releases.length,
  };

  return {
    edition,
    isCloud: isCloudEdition,
    plan,
    limits,
    canCreateResource: (resource: keyof PlanLimits) =>
      canCreate(edition, resource, counts[resource], plan),
    isOverLimit: (resource: keyof PlanLimits) =>
      isOverLimit(edition, resource, counts[resource], plan),
    getLimitMessage: (resource: keyof PlanLimits) =>
      getResourceLimitMessage(edition, resource, plan),
  };
}
```

### New: `apps/start/src/components/generic/PlanLimitBanner.tsx`

Reusable `Tile` with `border-destructive/30 bg-destructive/5` styling matching the existing seat limit banner on the members page.

```typescript
interface PlanLimitBannerProps {
  title: string;
  description: string;
  showBillingLink?: boolean;
  orgId?: string;
}
```

Uses `Tile`, `TileHeader`, `TileIcon`, `TileTitle`, `TileDescription` from `@repo/ui/components/doras-ui/tile`. Icon: `IconLock` from Tabler icons in destructive color.

---

## Phase 2: Saved Views UI enforcement

### 2a. Gate creation in `TaskFilterDropdown` + `NewView.tsx`

**`apps/start/src/components/tasks/filter/TaskFilterDropdown.tsx`**:
- Import `usePlanLimits`
- Where `showNewViewPopover` is computed (~line 112-130), add: `const { canCreateResource } = usePlanLimits(); const canCreateView = canCreateResource("savedViews");`
- Gate the `<NewViewPopover>` render: if `!canCreateView`, show a disabled "Save" button with tooltip "Saved view limit reached — upgrade to Pro" instead

**`apps/start/src/components/tasks/filter/NewView.tsx`**:
- No changes needed if we gate in the parent. Alternatively, accept `disabled?: boolean` prop to show a disabled state.

### 2b. Gate editing in tasks panel + settings views list

**`apps/start/src/components/admin/panels/tasks.tsx`** (saved views tab, ~lines 396-479):
- Import `usePlanLimits`
- When `isOverLimit("savedViews")`, show `<PlanLimitBanner>` at top of the views list
- Disable the pencil (edit) button on each view tile when over limit (add `disabled` prop or conditional render)
- Delete should remain functional

**`apps/start/src/components/pages/admin/settings/orgId/views.tsx`** (~lines 12-83):
- Import `usePlanLimits`
- When `isOverLimit("savedViews")`, show `<PlanLimitBanner>` above the views list
- Links to individual view pages should still work (navigation allowed), but the edit form on view-detail.tsx will be read-only

**`apps/start/src/components/pages/admin/orgid/views/index.tsx`** (~lines 18-168):
- Import `usePlanLimits`
- Show `<PlanLimitBanner>` when over limit

### 2c. Gate editing in view-detail.tsx editor page

**`apps/start/src/components/pages/admin/settings/orgId/view-detail.tsx`** (~lines 1-510):
- Import `usePlanLimits`
- When `isOverLimit("savedViews")`:
  - Show `<PlanLimitBanner>` at top of the editor
  - Disable the "Save" button (~line 177-200)
  - Allow the delete button to remain functional (~lines 202-223)

### 2d. Backend: limit check on PATCH /update-view

**`apps/backend/routes/api/internal/v1/organization.ts`** (~line 1462):
- After permission check, before the update:
  - Query current saved view count for the org
  - Use `canCreateResource("savedViews", currentCount - 1, org.plan)` — we use `count - 1` because we're editing an existing one, but the question is whether they're OVER the limit
  - Actually simpler: if `currentCount > limit`, block the edit. Use the same `isOverLimit` check the frontend uses (but server-side via `getEffectiveLimits`)
  - Return 403 with `getLimitReachedMessage("savedViews", org.plan)` + extra note about deleting to get under limit

---

## Phase 3: Issue Templates UI enforcement

### 3a. Gate create/edit in templates page + create-issue-template component

**`apps/start/src/components/pages/admin/settings/orgId/templates.tsx`** (~lines 42-64):
- Import `usePlanLimits`
- When `!canCreateResource("issueTemplates")`: hide or disable the create `<CreateIssueTemplate>` tile, replace with `<PlanLimitBanner>`
- When `isOverLimit("issueTemplates")`: pass `disabled={true}` to each edit-mode `<CreateIssueTemplate>` tile

**`apps/start/src/components/organization/create-issue-template.tsx`** (~632 lines):
- Add `disabled?: boolean` prop to the `Props` interface
- Create mode + disabled: show grayed-out tile with lock icon, not clickable
- Edit mode + disabled:
  - Dialog can still open (to view the template details)
  - Save button is disabled
  - Delete button remains functional
  - Show `<PlanLimitBanner>` inside the dialog header

### 3b. Backend: limit check on PATCH /edit-issue-template

**`apps/backend/routes/api/internal/v1/organization.ts`** (~line 1161):
- After permission check, before the update:
  - Query current issue template count for the org
  - If over limit, return 403 with limit message
  - Same pattern as saved views

---

## Phase 4: Releases UI enforcement

### 4a. Gate creation in releases list page

**`apps/start/src/components/pages/admin/orgid/releases/index.tsx`** (~lines 1-196):
- Import `usePlanLimits`
- When `!canCreateResource("releases")` (i.e., free plan with limit 0):
  - Replace "New Release" button in PageHeader with `<PlanLimitBanner>` or an upgrade prompt
  - Replace the empty state "Create Your First Release" button with an upgrade message
  - Existing release tiles remain fully functional and navigable

**`apps/start/src/components/pages/admin/orgid/releases/create-release-dialog.tsx`** (~lines 29-203):
- Accept `disabled?: boolean` prop
- When disabled, don't render the dialog trigger (or render it as disabled)

**`apps/start/src/components/organization/create-release.tsx`** (~lines 31-415):
- In create mode: accept `disabled?: boolean`, hide when disabled
- In edit mode: always functional (existing releases are editable)

### 4b. Sidebar (optional)

**`apps/start/src/components/admin/sidebars/primary-org.tsx`** (~lines 202-220):
- Releases sidebar item stays visible (users need access to existing releases)
- Optional: add a small "Pro" badge next to "Releases" for free plan users

---

## Files Summary

### Modified
| File | Phase | Changes |
|------|-------|---------|
| `packages/edition/src/capabilities.ts` | 0 | Add pure functions, export constants |
| `packages/edition/src/index.ts` | 0 | Export new functions |
| `apps/start/src/components/tasks/filter/TaskFilterDropdown.tsx` | 2 | Gate saved view creation |
| `apps/start/src/components/admin/panels/tasks.tsx` | 2 | Gate saved view editing in panel |
| `apps/start/src/components/pages/admin/settings/orgId/views.tsx` | 2 | Show banner when over limit |
| `apps/start/src/components/pages/admin/settings/orgId/view-detail.tsx` | 2 | Disable save when over limit |
| `apps/start/src/components/pages/admin/orgid/views/index.tsx` | 2 | Show banner when over limit |
| `apps/backend/routes/api/internal/v1/organization.ts` | 2, 3 | Add limit checks on PATCH endpoints |
| `apps/start/src/components/pages/admin/settings/orgId/templates.tsx` | 3 | Gate template create/edit |
| `apps/start/src/components/organization/create-issue-template.tsx` | 3 | Add disabled prop |
| `apps/start/src/components/pages/admin/orgid/releases/index.tsx` | 4 | Gate release creation |
| `apps/start/src/components/pages/admin/orgid/releases/create-release-dialog.tsx` | 4 | Add disabled prop |
| `apps/start/src/components/organization/create-release.tsx` | 4 | Add disabled prop |

### New
| File | Phase | Purpose |
|------|-------|---------|
| `apps/start/src/hooks/usePlanLimits.ts` | 1 | Shared hook for plan limit checks |
| `apps/start/src/components/generic/PlanLimitBanner.tsx` | 1 | Reusable limit reached banner |
