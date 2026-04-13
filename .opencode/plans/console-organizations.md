# Console Organizations View

## Overview

Add an **Organizations** tab to the admin console (`/console`) with full CRUD-free read-only visibility into all organizations on the platform. Clicking an org opens a detail page at `/console/organizations/$orgId`.

## Files to modify

### 1. `apps/backend/routes/api/internal/v1/console.ts`

Add two new routes before the `apiRouteConsole.delete("/system-api-keys/:keyId", ...)` handler:

- **`GET /console/organizations`** — paginated, searchable, filterable list
  - Query params: `page`, `limit`, `search` (name/slug ilike), `plan` (free|pro), `sortBy`, `sortDirection`
  - Selects: `id`, `name`, `slug`, `logo` (CDN), `plan`, `seatCount`, `isSystemOrg`, `shortId`, `createdAt`, `updatedAt`, `createdBy`
  - Inline `memberCount` via `db.$count(schema.member, eq(schema.member.organizationId, schema.organization.id))`
  - Auth guard: session + admin role
  - Returns `paginatedSuccessResponse`

- **`GET /console/organizations/:orgId`** — full detail
  - Selects all org columns (including `polarCustomerId`, `polarSubscriptionId`, `currentPeriodEnd`, `settings`, `bannerImg`)
  - Fetches members via `db.query.member.findMany` with `user` (safe columns: id, name, displayName, email, image, role, banned) and `teams` (with team: id, name, isSystem, permissions)
  - Maps `isAdmin = permissions?.admin?.administrator === true`
  - Returns `successResponse({ org, members })`

### 2. `apps/start/src/lib/fetches/console.ts`

Append new types and fetch functions:

```typescript
export type ConsoleOrg = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: string;
  seatCount: number;
  isSystemOrg: boolean;
  shortId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string | null;
  memberCount: number;
};

export type ConsoleOrgsParams = {
  page?: number;
  limit?: number;
  search?: string;
  plan?: "free" | "pro" | "";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

export type ConsoleOrgMember = {
  id: string;
  userId: string;
  joinedAt: string | Date | null;
  seatAssigned: boolean;
  user: {
    id: string;
    name: string;
    displayName?: string | null;
    email: string;
    image: string | null;
    role?: string | null;
    banned?: boolean | null;
  };
  teams: {
    id: string;
    name: string;
    isSystem: boolean;
    isAdmin: boolean;
    permissions: TeamPermissions;
  }[];
};

export type ConsoleOrgDetail = {
  org: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    bannerImg: string | null;
    description: string;
    plan: string;
    seatCount: number;
    isSystemOrg: boolean;
    shortId: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    createdBy: string | null;
    polarCustomerId: string | null;
    polarSubscriptionId: string | null;
    currentPeriodEnd: string | Date | null;
    settings: Record<string, unknown> | null;
  };
  members: ConsoleOrgMember[];
};

export async function getConsoleOrgs(params?: ConsoleOrgsParams): Promise<{ success: boolean; data: ConsoleOrg[]; pagination?: ConsolePaginationMeta; error?: string }>;
export async function getConsoleOrg(orgId: string): Promise<{ success: boolean; data?: ConsoleOrgDetail; error?: string }>;
```

### 3. `apps/start/src/lib/serverFunctions/getConsoleData.ts`

Append `getConsoleOrgsServer` and `getConsoleOrgServer`:

- `getConsoleOrgsServer` — mirrors `getConsoleUsersServer` exactly; used for SSR page 1 load
- `getConsoleOrgServer({ data: { orgId } })` — mirrors `getConsoleUserServer`; redirects to `/console` if not found

### 4. `apps/start/src/components/console/org-table.tsx` *(new file)*

Mirrors `user-table.tsx`. Key differences:
- Props: `initialData: { orgs: ConsoleOrg[]; pagination: ConsolePaginationMeta }`
- Columns: `name/logo` (links to `/console/organizations/$orgId`), `slug`, `plan` (Badge: `free`→outline, `pro`→default), `memberCount` (icon + count), `createdAt`, `isSystemOrg` (badge shown only when true), `actions` (View only — read-only)
- Filters: search (name/slug), plan filter popover (free | pro)
- No bulk-select delete action (read-only)
- No "Add org" button

### 5. `apps/start/src/components/console/org-detail.tsx` *(new file)*

Mirrors `user-detail.tsx`. Structure:

```
OrgDetail (default export)
  OrgHeader                ← Card: logo + bannerImg preview, name, slug, shortId, plan badge, system badge, created/updated dates
  Tabs
    MembersSection         ← Table: avatar, name/email (links to /console/users/$userId), role badge, banned badge, teams badges, joined date
    SettingsSection        ← Card: renders org settings fields (allowActionsOnClosedTasks, publicActions, enablePublicPage, etc.) as labeled rows
    BillingSection         ← Cloud-only: Card with polarCustomerId, polarSubscriptionId, currentPeriodEnd, plan, seatCount
```

- `isCloud` guard: `const isCloud = import.meta.env.VITE_SAYR_EDITION === "cloud"` — BillingSection tab hidden on CE

### 6. `apps/start/src/routes/(admin)/console/index.tsx`

- Add `getConsoleOrgsServer` import
- In `loader`: call `getConsoleOrgsServer({ data: { page: 1, limit: 25 } })` in parallel with users (can be done with `Promise.all` or sequentially)
- Return `{ users, pagination, orgs, orgsPagination }` from loader
- In `RouteComponent`: destructure `orgs, orgsPagination` from `useLoaderData()`
- Add `<TabsTrigger value="organizations">Organizations</TabsTrigger>`
- Add `<TabsContent value="organizations"><OrgTable initialData={{ orgs, pagination: orgsPagination }} /></TabsContent>`

### 7. `apps/start/src/routes/(admin)/console/organizations/$orgId.tsx` *(new file)*

Mirrors `users/$userId.tsx`:
```typescript
export const Route = createFileRoute("/(admin)/console/organizations/$orgId")({
  loader: async ({ params, context }) => { ... getConsoleOrgServer({ data: { orgId: params.orgId } }) },
  head: ({ loaderData }) => ({ meta: seo({ title: `${(loaderData as ConsoleOrgDetail)?.org?.name} · Console` }) }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData() as ConsoleOrgDetail;
  return (
    <SubWrapper title={data.org.name} description={`/${data.org.slug}`} backButton="../.." backButtonClassName="bg-muted!">
      <OrgDetail data={data} />
    </SubWrapper>
  );
}
```

## Edition awareness

- Billing tab in `OrgDetail`: only rendered when `import.meta.env.VITE_SAYR_EDITION === "cloud"`
- Plan/Polar columns in `OrgTable`: always shown (plan column is informational and valid on CE too — CE orgs have `plan: "free"`)
- No new capabilities or limits needed in `@repo/edition`
