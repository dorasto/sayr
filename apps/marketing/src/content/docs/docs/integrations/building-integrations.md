---
title: Building Integrations
description: A complete guide to creating Sayr integrations — from scaffolding to production
sidebar:
   order: 99
---

Sayr has a first-party integration system that allows contributors to build deep, self-contained connections between Sayr and external services. Integrations live under `integrations/services/` in the monorepo, each as a fully isolated package that registers itself into the runtime at startup.

The Discord Bot integration is the best reference implementation. This guide walks through every layer of the system using it as a concrete example.

---

## How the integration system works

When the `integrations` app starts, it scans `integrations/services/` for subdirectories. For each one it:

1. Imports `integration.ts` (or the built `dist/integration.js`) — this registers the integration via `registerIntegration()`.
2. If the integration does **not** set `requiresExternalService: true` (and has no `noServiceWorker` flag), it also imports `src/index.ts`, which is where any long-running processes (bots, polling loops, SSE listeners) are started.
3. Mounts the integration's Hono API under `/:orgId/integrations/<id>`.

An integration is only loaded at all if the environment variable `INTEGRATION_<ID_UPPERCASE>_ENABLED=true` is set. This means integrations are opt-in at the deployment level — unused integrations add zero overhead.

```
integrations/
  services/
    discordbot/
      integration.ts   ← manifest + registerIntegration()
      api/index.ts     ← Hono route handlers
      ui/pages.ts      ← declarative UI definition
      docs.ts          ← markdown shown in the admin overview sheet
      src/index.ts     ← bot process / long-running service
      src/types/       ← shared TypeScript interfaces
      package.json
      tsconfig.json
```

---

## Scaffolding a new integration

The fastest way to create a new integration is the `create-integration` CLI:

```bash
pnpm create-integration "My Integration" --author "Your Name" --description "What it does"
```

This generates a complete skeleton under `integrations/services/my-integration/` with working API routes, UI pages, a service worker entry-point, and a documentation stub — all with your chosen name pre-filled.

After scaffolding:

1. Run `pnpm install` from the monorepo root to link the new workspace package.
2. Set `INTEGRATION_MY-INTEGRATION_ENABLED=true` in your environment (or `.env`).
3. Start the integrations app (`pnpm dev` or `pnpm -F integrations dev`).
4. Open **Settings → Connections → My Integration** in the Sayr admin to verify it appears.

---

## The integration manifest (`integration.ts`)

Every integration must export an `IntegrationManifest` object and call `registerIntegration()`.

```typescript
import type { IntegrationManifest } from "@repo/integrations/types";
import { apiRoute } from "./api";
import { settingsPage, templatesPage } from "./ui/pages";
import { docs } from "./docs";
import { registerIntegration } from "@repo/integrations";

const integration: IntegrationManifest = {
   id: "discordbot",          // unique, lowercase, URL-safe slug
   name: "Discord Bot",       // human-readable name shown in the UI
   version: "1.0.0",
   description: "Create tasks from Discord with slash commands",
   icon: "IconBrandDiscord",  // Tabler icon name
   docs,                      // markdown string shown in the admin overview
   api: apiRoute,             // Hono app handling all HTTP routes for this integration
   ui: {
      pages: {
         settings: settingsPage,
         templates: templatesPage,
      },
      components: {},
   },
   author: {
      name: "Doras Media Ltd",
      url: "https://github.com/dorasto",
   },
   requiresExternalService: false,  // set true if src/index.ts is NOT run by the integrations host
};

registerIntegration(integration);
export { integration };
export { apiRoute } from "./api";
```

### Manifest fields reference

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique slug. Determines the API path (`/:orgId/integrations/<id>`) and the env var name (`INTEGRATION_<ID>_ENABLED`). |
| `name` | `string` | Display name shown in the connections list. |
| `version` | `string` | SemVer string for tracking releases. |
| `description` | `string` | One-line summary shown on integration cards. |
| `icon` | `string` | A Tabler icon component name (e.g. `IconBrandDiscord`, `IconApi`). |
| `docs` | `string` | Markdown rendered inside the admin overview sheet for this integration. |
| `api` | `Hono` | A Hono app. All routes are mounted under `/:orgId/integrations/<id>`. |
| `ui.pages` | `Record<string, UIPage>` | Named pages rendered in the admin settings panel. |
| `author` | `{ name, url? }` | Shown in the integration overview. |
| `requiresExternalService` | `boolean` | When `true`, `src/index.ts` is **not** auto-started by the host. Use this when the service runs separately (e.g., a standalone Docker container). |
| `noServiceWorker` | `boolean` | Disables loading `src/index.ts` entirely (useful for API-only integrations). |
| `externalServiceNote` | `string` | Informational note logged at startup when `requiresExternalService` is `true`. |

---

## Writing API routes (`api/index.ts`)

The `api` field in the manifest is a standard [Hono](https://hono.dev) application. Every request to `/:orgId/integrations/<id>/*` is forwarded to it, with `orgId` already set in the Hono context.

```typescript
import { Hono } from "hono";
import { getIntegrationConfig, setIntegrationConfig, getIntegrationStorage, setIntegrationStorage } from "@repo/database";

type AppEnv = {
   Variables: {
      orgId: string;
   };
};

const INTEGRATION_ID = "my-integration";

export const apiRoute = new Hono<AppEnv>();
```

### Reading and writing configuration

Use `getIntegrationConfig` / `setIntegrationConfig` from `@repo/database` to persist per-organization key/value settings. Values are stored as JSONB.

```typescript
// Reading settings
apiRoute.get("/settings", async (c) => {
   const orgId = c.get("orgId");
   const settings = await getIntegrationConfig<MySettings>(orgId, INTEGRATION_ID, "settings");
   return c.json({ success: true, data: settings?.value ?? null });
});

// Writing settings (partial update pattern)
apiRoute.patch("/settings", async (c) => {
   const orgId = c.get("orgId");
   const body = await c.req.json();

   const current = await getIntegrationConfig<MySettings>(orgId, INTEGRATION_ID, "settings");

   const updated: MySettings = {
      ...current?.value,
      apiKey: body.apiKey ?? current?.value?.apiKey,
   };

   await setIntegrationConfig(orgId, INTEGRATION_ID, "settings", updated);
   return c.json({ success: true });
});
```

### Storing freeform data

Use `getIntegrationStorage` / `setIntegrationStorage` to store arbitrary JSON blobs (e.g. lists of templates, cached objects, message IDs). Unlike config, storage is a single JSONB blob per `(orgId, integrationId)` pair — merge carefully.

```typescript
// Read stored templates
const storage = await getIntegrationStorage(orgId, INTEGRATION_ID);
const data = (storage?.data ?? {}) as { templates?: Template[] };
const templates = data.templates ?? [];

// Write back after modification
await setIntegrationStorage(orgId, INTEGRATION_ID, { ...data, templates });
```

### Querying the Sayr database directly

API routes run inside the integrations host, which has full access to `@repo/database`. You can query any table directly:

```typescript
import { db, schema } from "@repo/database";
import { eq } from "drizzle-orm";

// Example: fetch all categories for an org
const categories = await db
   .select({ id: schema.category.id, name: schema.category.name })
   .from(schema.category)
   .where(eq(schema.category.organizationId, orgId));
```

This is used in the Discord Bot to populate the category selector when creating templates.

---

## Defining UI pages (`ui/pages.ts`)

Pages are **data-driven** — you describe what to render using a declarative schema, and the Sayr admin UI renders it automatically. You do not write React components.

Each page is a `UIPage` object exported from `ui/pages.ts` and referenced in the manifest's `ui.pages` map.

```typescript
import type { UIPage } from "@repo/integrations/types";

export const settingsPage: UIPage = {
   title: "Settings",
   description: "Connect your Discord server",
   layout: "admin",
   api: {
      path: "/settings",          // relative to /:orgId/integrations/<id>/
      methods: { get: {}, patch: {} },
   },
   sections: [ /* ... */ ],
};
```

### Page fields

| Field | Description |
|---|---|
| `title` | Shown as the page tab label. |
| `description` | Subtitle text under the page title. |
| `layout` | `"admin"` (default sidebar layout) or `"full"` (full-width). |
| `api.path` | The API route this page reads from / writes to. |
| `api.methods` | Which HTTP methods the page uses (`get`, `post`, `patch`, `put`, `delete`). |
| `sections` | Array of `UISection` objects describing what to render. |

### Section types

#### `card` — a form-like panel

```typescript
{
   type: "card",
   title: "Discord Connection",
   description: "Enter your server details",
   fields: [
      {
         name: "guildId",
         type: "string",
         label: "Server ID",
         description: "Right-click your server name and choose Copy ID",
         placeholder: "123456789012345678",
      },
      {
         name: "channelId",
         type: "string",
         label: "Default Channel ID",
      },
   ],
   actions: [
      { type: "save", label: "Save Connection" },
      { type: "open", label: "Invite the Bot", url: process.env.DISCORD_BOT_INVITE_URL },
   ],
}
```

#### `list` — a CRUD table

Use `data` (a JSONPath expression against the API response) to point at the array to render.

```typescript
{
   type: "list",
   data: "$.templates",       // path into the GET response
   title: "Task Templates",
   item: {
      key: "id",              // field used as the row key
      fields: [               // columns shown in the table
         { name: "name", type: "string", label: "Name" },
      ],
      actions: [
         { type: "create", label: "New Template", path: "/templates", method: "POST" },
         { type: "edit",   label: "Edit",          path: "/templates", method: "PATCH" },
         { type: "delete", label: "Delete",         path: "/templates" },
      ],
      createFields: [         // fields shown in the Create / Edit dialog
         { name: "name", type: "string", label: "Template Name", required: true },
         { name: "status", type: "select", label: "Status", options: [
            { value: "todo", label: "To Do" },
            { value: "in-progress", label: "In Progress" },
         ]},
      ],
   },
}
```

#### `tabs` — multiple sections in a tabbed layout

```typescript
{
   type: "tabs",
   tabs: [
      { id: "general", label: "General", content: { type: "card", /* ... */ } },
      { id: "advanced", label: "Advanced", content: { type: "card", /* ... */ } },
   ],
}
```

#### `grid` — side-by-side sections

```typescript
{
   type: "grid",
   columns: 2,
   children: [
      { type: "card", /* ... */ },
      { type: "card", /* ... */ },
   ],
}
```

### Field types

| Type | Description |
|---|---|
| `string` | Single-line text input. |
| `textarea` | Multi-line text area. |
| `number` | Numeric input. |
| `boolean` | Toggle / checkbox. |
| `select` | Dropdown. Provide `options` (static) or `optionsData` (JSONPath into API response). |
| `date` | Date picker. |
| `label` | Non-interactive text label. |
| `heading` | Section heading with optional description. |
| `readonly` | Displays a value without an input. Use `bind` to point at data. |

### Linking select options to API data

When options come from the API (e.g. a list of categories), use `optionsData` with a JSONPath:

```typescript
{
   name: "categoryId",
   type: "select",
   label: "Category",
   optionsData: "$.categories",   // path into the GET /templates response
}
```

The API route must return the options array at that path:

```typescript
return c.json({
   success: true,
   data: {
      templates,
      categories: categories.map((c) => ({ value: c.id, label: c.name })),
   },
});
```

---

## Writing integration documentation (`docs.ts`)

The `docs` field on the manifest is a markdown string. It is rendered inside the **Overview** sheet in the admin panel when an admin views the integration.

Write this as end-user documentation — explain what the integration does, how to configure it, and any external setup steps required.

```typescript
export const docs = `
Sayr integrates with Discord via a slash-command bot, letting your team create tasks without leaving Discord.

- **\`/sayr create\`** — Opens a form to submit a new task directly from any channel.
- **Templates** — Configure multiple task templates, each with custom questions and default values.

---

### Setup (Sayr Cloud)

1. Invite the bot to your server.
2. Copy your Server ID and Default Channel ID.
3. Paste them into the Settings page.
4. Create at least one template.

### Setup (Self-hosted)

1. Create a Discord application and add a Bot.
2. Copy the bot token into your environment configuration.
3. Follow the cloud setup steps above.
`;
```

---

## Building a background service (`src/index.ts`)

When `requiresExternalService` is `false` (the default), the integrations host automatically runs `src/index.ts` on startup. This is where you start any long-running process — a Discord bot, a polling loop, an SSE listener, etc.

### Listening to Sayr real-time events

Use the `@sayrio/public` SDK and `Sayr.sse()` to subscribe to Sayr's SSE stream. This is how the Discord Bot reacts to task changes without polling:

```typescript
import Sayr from "@sayrio/public";

Sayr.client.setToken(process.env.SAYR_API_KEY);
Sayr.client.setBaseUrl(process.env.API_URL);

Sayr.sse(
   `${API_URL}/events?channel=system`,
   {
      [Sayr.EVENTS.CREATE_TASK]: async (task) => {
         await handleTask(task);
      },
      [Sayr.EVENTS.UPDATE_TASK]: async (task) => {
         await handleTask(task);
      },
   },
   {
      eventSource: EventSource,
      eventSourceOptions: {
         fetch: (input, init) =>
            fetch(input, {
               ...init,
               headers: {
                  ...init?.headers,
                  "authorization": `Bearer ${process.env.SAYR_API_KEY}`,
                  "User-Agent": "integration/my-integration/1.0.0",
               },
            }),
      },
   }
);
```

### Authenticating with the Sayr API

Integrations authenticate using a `SAYR_API_KEY` environment variable. This key must be provisioned when deploying the integrations app and is passed as a Bearer token.

### Creating timeline events

Integrations can write to a task's timeline using `Sayr.me.createTimelineEvent()`. This is how the Discord Bot records which Discord message is linked to a task:

```typescript
await Sayr.me.createTimelineEvent({
   id: "my-integration",
   taskId: task.id,
   orgId: task.organizationId,
   type: "sidebar",
   name: "my-integration",
   data: {
      externalId: "some-id",
      url: "https://external-service.com/item/123",
   },
});
```

### Creating tasks programmatically

```typescript
const result = await Sayr.me.createTask({
   title: "Bug: login fails on mobile",
   description: "Reported via Discord by @username",
   status: "todo",
   priority: "high",
   orgId: "org_id_here",
   integration: {
      id: "my-integration",
      name: "My Integration",
      platform: "first-party",
   },
   createdBy: {
      type: "external",
      userId: "external-user-id",
      name: "External User",
   },
});
```

---

## Environment variables

Integrations control which variables they need. At minimum, all integrations use:

| Variable | Purpose |
|---|---|
| `INTEGRATION_<ID>_ENABLED` | Set to `true` to enable this integration. Required — the integration will not load without it. |
| `SAYR_API_KEY` | API key for calling the Sayr public API and SSE stream. |

Add any service-specific secrets (bot tokens, API keys, webhook secrets) in the same `.env` file. Access them via `process.env` in `src/index.ts` or `api/index.ts`.

---

## Checking config uniqueness across organizations

Some integrations need to ensure that a given external resource (like a Discord server) can only be claimed by one Sayr organization at a time. Use `getIntegrationConfigByValue` to look up existing ownership:

```typescript
import { getIntegrationConfigByValue } from "@repo/database";

const existing = await getIntegrationConfigByValue(
   "settings",          // config key
   "discordbot",        // integration ID
   "guildId",           // the JSON field to check inside the value blob
   body.guildId         // the value to look for
);

if (existing && existing.organizationId !== orgId) {
   return c.json({ error: "This server is already connected to another organization" }, 400);
}
```

---

## Full example: Discord Bot integration summary

The Discord Bot (`integrations/services/discordbot/`) demonstrates all of these patterns together:

| File | What it does |
|---|---|
| `integration.ts` | Defines the manifest, registers the integration. |
| `api/index.ts` | Hono routes for reading/writing settings and managing templates. Uses `getIntegrationConfig`, `setIntegrationConfig`, `getIntegrationStorage`, `setIntegrationStorage`, and direct DB queries. |
| `ui/pages.ts` | Declarative `settings` page (card with save + invite-bot action) and `templates` page (CRUD list with create/edit/delete dialogs). |
| `docs.ts` | Markdown overview shown to admins. |
| `src/index.ts` | Starts the Discord.js client, registers slash commands, connects to Sayr's SSE stream to post and update Discord messages when tasks change. |
| `src/commands/create.ts` | Handles `/sayr create` — shows template picker or modal, submits task via `Sayr.me.createTask()`, posts a confirmation. |
| `src/types/index.ts` | Shared TypeScript interface for the settings config value. |

---

## Testing your integration locally

1. Copy `integrations/.env.example` to `integrations/.env` and fill in the required variables.
2. Add `INTEGRATION_<YOUR_ID>_ENABLED=true` to that file.
3. Start the full stack with `pnpm dev` or start the integrations app independently.
4. Navigate to **Settings → Connections** in any Sayr organization to see your integration listed.
5. Check the server console — a successful registration prints:

   ```
   Integration 'my-integration' loaded successfully: My Integration (version 1.0.0) by Your Name.
   ```

---

## Related guides

- [Architecture Overview](/docs/contributing/architecture) — How the monorepo applications and packages fit together
- [Adding Features](/docs/contributing/adding-features) — End-to-end feature implementation walkthrough
- [Database Guide](/docs/contributing/database) — Drizzle ORM patterns used throughout the codebase
