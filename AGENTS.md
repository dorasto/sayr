<!-- ZCP:BEGIN -->
# Zerops

Developer machine bound to a Zerops project. `zerops_*` MCP = primary surface for state/lifecycle/deploy/env/logs/verify. Local Bash/git/npm normal for working-dir setup.

Working dir = source of truth. Deploy: `zerops_deploy targetService="<hostname>"` (pushes working dir, blocks until build; needs `zerops.yaml` at repo root).

**Env:** this Mac shell does NOT carry the project's injected env — managed values resolve only inside Zerops containers. For a local `.env` use `zerops_env action="generate-dotenv"` (resolves server-side, writes the file); reach services over `zcli vpn up`. Never fetch a credential value to paste into a command.

## Zerops onboarding

When the user asks to be onboarded to Zerops — the exact phrase "onboard me to Zerops"
(any capitalization/punctuation), or a clear meta-onboarding request ("get me started
with Zerops", "I'm new here — what now?") — run the onboarding conversation before the
routing below. A request to get started with a SPECIFIC technology or task ("help me
get started with PostgreSQL", "deploy this repo") is normal routing, not onboarding.

1. Fetch `zerops_knowledge uri="zerops://playbooks/onboarding"` once and follow it.
2. Greet and offer its fork immediately — the opening needs no other tool call. Read-only
   state checks come after the person answers (or when they ask what's here); don't
   provision, import, or mutate anything until they pick a direction.
3. Once the user chooses to build or bring an app, normal routing (and the guided skill,
   when present) owns the work — onboarding only opens the conversation.
4. If Zerops tools are unavailable or auth fails, say so plainly and surface the reported
   recovery — never simulate onboarding.

Zerops has its own syntax. Don't guess — look up via `zerops_knowledge`, inspect live state via `zerops_*`. Runtime code runs in Zerops containers, not here.

## Route every user turn

| Intent | First action | Don't |
|---|---|---|
| Build/edit/scaffold/fix/deploy/debug a service | `zerops_discover`/`zerops_workflow action="status"` first if target/session unclear, then `zerops_workflow action="start" workflow="develop" intent="..." scope=["<host>"]` | Write code, run Bash/npx/SSH, or scaffold to scratch dirs before workflow start |
| No service yet, or infra/topology change — INCLUDING "deploy / set up / scaffold from existing recipe X" (user names a recipe slug like `zerops-laravel-minimal`) | `zerops_workflow action="start" workflow="bootstrap" intent="..."` — the route-menu surfaces the matching recipe; pick `route="recipe"` with the named slug | Write app code in bootstrap |
| Read or set platform state — logs/env/status/scale/subdomain/manage/events/verify | matching `zerops_*` tool | Guess values when live state exists |
| Promote dev/stage to a separate prod project ("go live", "deploy to prod", "nasaď na prod") | `zerops_workflow action="start" workflow="launch-production" intent="..." targetService="<host>"` | `zcli project create` or hand-rolled import.yaml |
| Pure concept Q unrelated to this project | prose, no tool | Re-route when user pivots to build/change |

## Discovery floor

Before service-scoped work: `zerops_workflow action="status"` if a session may exist (post-compact), else `zerops_discover`. User didn't name service + multiple plausible targets → ask once. Never invent hostnames, env keys, service types, subdomain URLs.

## Connection vars & secrets

Reference by name, never paste the value. `zerops_env`/`zerops_discover` read env KEYS and set STATE; a value you need in a command is `$VAR` — the shell expands it at exec time, so the value never enters your context. Pulling a credential value to paste into a command, file, or commit is the leak.

## Smells — catch & re-route

- Multi-section prose analysis (framework cmp, IA, "let me first analyze") for service-shaped task → workflow start IS the analysis surface (returns plan + atoms scoped to your `intent`). Pick a sensible default, start, react to the response. User saying "analyze first" / "make a plan" doesn't bypass.
- Writing code or `zerops.yaml` before workflow/status/discover selected service.
- Files in `/tmp` or random scratch dirs for app code.
- Asking whether to deploy to Zerops when ZCP is already bound to this project.
- Bash/SSH for platform ops covered by `zerops_*` (env, logs, scale, restart, etc.).
- Diagnosing live errors/502s/build failures from prose instead of `zerops_verify`/`zerops_logs`/`zerops_events`/`zerops_env`.
- Hand-rolling `import.yaml` or `zcli project create` for a "promote to prod" / "go live" intent → `workflow="launch-production"`.

## Workflow detail

- `develop` — service code edit. `scope` = runtime services this touches; get from `zerops_discover`, don't invent. `intent` = one-line proposal; workflow returns the plan, react to that. 1 task = 1 session; new `intent` auto-closes prior.
- `bootstrap` — provision services / change infra. Closes → continue in develop. Mid-develop infra side-trip: start bootstrap; develop session persists.
- `launch-production` — promote dev/stage to a SEPARATE prod project. Stateless multi-call: `scope-prompt` → `classify-prompt` → `ready-to-launch` → `launching` → `configuring-pipeline` → `launched`. Each call passes the accumulated `inputs` block forward (no `action="complete"` — that's bootstrap-only). At `ready-to-launch`, `delegatedLaunch.available` says whether ZCP can mint the launch-window token itself from a one-time platform delegation on `confirmLaunch=true` (no value crosses the conversation); otherwise the user supplies one manually (Custom access per project + Allow creating projects toggle ON) as `launchKey`. ZCP never persists it either way. `targetService` accepts either half of a standard pair.

## Recovery

Phase unclear (post-compact, mid-task): `zerops_workflow action="status"`. Returns envelope, plan, next action.

## Tool errors

Shape: `{code, error, suggestion?, apiCode?, diagnostic?, apiMeta?, checks?, recovery?}`. `code`+`error` always present. `recovery` set → call before retry/ask. Absent → fall back to `zerops_workflow action="status"`. `checks` = multi-check failures (`kind` + optional `preAttestCmd`/`expectedExit`).
<!-- ZCP:END -->

# AGENTS.md - Sayr Project Management Platform

## Repository Overview

Turborepo monorepo for Sayr.io, a transparent, collaborative project management platform bridging internal workflows with public collaboration via granular visibility controls (public/private per-item). Package manager is **pnpm**; **Biome** for lint/format; TypeScript throughout; **Bun** runtime for `backend`/`worker`.

### Apps

| App | Description |
|---|---|
| `apps/backend` | Hono API server on Bun (REST + WebSocket, port 5468) |
| `apps/start` | TanStack Start frontend with React 19 (port 3000) — the production admin + public UI |
| `apps/marketing` | Astro marketing site with Starlight docs (port 3002) |
| `apps/worker` | GitHub webhook queue processor (Bun) |
| `apps/nginx` | Reverse proxy config (Dockerfile + templates, not a Node app) |
| `apps/traefik` | Edge router config (Dockerfile + templates, not a Node app) |

### Packages

| Package | Description |
|---|---|
| `@repo/auth` | Better Auth config (GitHub + Doras OAuth) |
| `@repo/database` | Drizzle ORM schemas and CRUD functions (PostgreSQL) |
| `@repo/edition` | Edition detection (cloud/community/enterprise), capabilities, and plan limits |
| `@repo/storage` | MinIO S3-compatible client with obfuscated filenames |
| `@repo/ui` | Shadcn/ui component library |
| `@repo/util` | Shared utilities (date formatting, slugs, CDN URLs, `formatTaskKey`) |
| `@repo/queue` | Job queue abstraction (Redis or file-based) |
| `@repo/opentelemetry` | Tracing and observability utilities |
| `@repo/ai` | Requesty (OpenAI-compatible gateway) client built on TanStack AI — text generation, curated model catalog (task summaries, etc.) |
| `@repo/ai-prompts` | Shared prompt definitions consumed by `@repo/ai` callers |
| `@repo/integrations` | Third-party integration registry — manifests gated by `INTEGRATION_<ID>_ENABLED` env flags |
| `@repo/create-integration` | Scaffolding CLI for new integrations (`pnpm create-integration`) |
| `@repo/typescript-config` | Shared `tsconfig.json` bases |
| `@sayrio/public` | Public read-only JS/TS SDK for Sayr.io (REST + SSE), published separately |

## Commands

### Development
```bash
pnpm dev                          # Start backend, start, integrations, marketing, @repo/database
pnpm dev:op                       # Start with 1Password secret injection
pnpm dev:ce / dev:ce:op           # Start with SAYR_EDITION=community
pnpm dev:cloud / dev:cloud:op     # Start with SAYR_EDITION=cloud
pnpm -F backend dev               # Backend only
pnpm -F start dev                 # Frontend (TanStack Start) only
pnpm -F marketing dev             # Marketing site only
pnpm -F worker dev                # GitHub webhook processor only
```

### Build & Quality
```bash
pnpm build                        # Build all apps (turbo build)
pnpm lint                         # Run Biome linting (turbo lint)
pnpm lint:fix                     # Fix lint issues
pnpm format                       # Format with Biome (turbo format)
pnpm check-types                  # TypeScript type checking (turbo check-types)
```

### Database (packages/database)
```bash
pnpm -F @repo/database generate   # Generate migration from schema changes
pnpm -F @repo/database migrate    # Apply schema to PostgreSQL
pnpm -F @repo/database db:studio  # Open Drizzle Studio
```

### Testing
```bash
pnpm -F start test                # Run all tests (vitest)
pnpm -F start test -- --testNamePattern="pattern"   # Run tests matching pattern
pnpm -F start test -- path/to/file.test.ts          # Run specific test file
```

## Code Style (Biome)

**There is no root `biome.json`** — every app/package has its own (`apps/start/biome.json`, `packages/ui/biome.json`, etc.), so a repo-root `pnpm exec biome format --write <file>` fails with "Found a nested root configuration, but there's already a root configuration." **Run Biome from inside the specific app/package directory** you're formatting (`cd apps/start && pnpm exec biome format --write src/foo.tsx`), not from the repo root.

### Formatting
- **Indentation**: Tabs, width 3
- **Line width**: 120 characters
- **Line endings**: CRLF
- **Quotes**: Double quotes
- **Semicolons**: Always required
- **Trailing commas**: ES5 style
- **Arrow parentheses**: Always required

### Import Patterns
```typescript
// 1. Workspace packages - use @repo/* alias
import { db, schema, createTask } from "@repo/database";
import { Avatar, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";

// 2. External packages
import { Hono } from "hono";
import { useState, useEffect } from "react";
import { and, eq } from "drizzle-orm";

// 3. Local imports - use @/ alias (maps to src/ or app root)
import type { AppEnv } from "@/index";
import { SubWrapper } from "@/components/generic/wrapper";
import { errorResponse } from "../../responses";  // or relative paths
```

### TypeScript
- **Strict mode**: Enabled with strictNullChecks
- **Type imports**: Use `import type` for type-only imports
- **Avoid `any`**: Warned by linter, use explicit types
- **Drizzle types**: Use `$inferSelect`/`$inferInsert` for schema types
- **Extended types**: Define in schema index (e.g., `TaskWithLabels`, `OrganizationWithMembers`)

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Variables/functions | camelCase | `orgId`, `getTaskById`, `isAuthorized` |
| Types/interfaces | PascalCase | `TaskContentProps`, `AppEnv` |
| Components | PascalCase | `TaskContent`, `SubWrapper` |
| Route handlers | camelCase with prefix | `apiRouteAdminOrganization` |
| Error codes | UPPER_SNAKE_CASE | `TASK_CREATION_FAILED` |
| Database enums | camelCase | `statusEnum`, `visibleEnum` |

### Error Handling

**Backend (Hono):**
```typescript
try {
   // operation
} catch (err) {
   await recordWideError({
      name: "task.create.failed",        // dotted notation
      error: err,
      code: "TASK_CREATION_FAILED",      // uppercase code
      message: "Failed to create task",
      contextData: { orgId, title },     // relevant context
   });
   return c.json({ success: false, error: "Failed to create task" }, 500);
}
```

**React:**
```typescript
// Context hooks throw descriptive errors
if (context === undefined) {
   throw new Error("useLayoutOrganization must be used within RootProviderOrganization");
}
```

### Component Structure
```typescript
interface TaskContentProps {
   task: schema.TaskWithLabels;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function TaskContent({ task, open, onOpenChange }: TaskContentProps) {
   // hooks first
   const [state, setState] = useState<string>("");
   
   // effects
   useEffect(() => { ... }, []);
   
   // handlers
   const handleSubmit = async () => { ... };
   
   // render
   return <div>...</div>;
}
```

## Key Patterns

### Permission Checking (Backend)
```typescript
const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "permission.key");
if (!isAuthorized) {
   return c.json({ success: false, error: "Permission denied" }, 401);
}
```

### WebSocket Broadcasting
```typescript
const data = { type: "UPDATE_TASK" as WSBaseMessage["type"], data: taskWithData };
broadcast(orgId, "tasks", data, excludeSocket);
broadcastPublic(orgId, { ...data });
```

### Tracing (OpenTelemetry)
```typescript
const traceAsync = createTraceAsync();
const result = await traceAsync("operation.name", () => performOperation(), {
   description: "Human readable description",
   data: { contextData },
});
```

### PageHeader
All admin pages must use a consistent `PageHeader` component (`h-11`, sticky, two zones: Identity left + Toolbar right). Task list pages integrate `UnifiedTaskView` which supports both single-org and cross-org modes. See the `page-header` skill for full patterns and props reference.

### Page / panel layout
Every page needing a floating side panel (right or left) goes through the shared `Page` component + `IndentDrawer` primitive + a global `sidebar-store` — a non-modal, portalled drawer that pushes (not covers) main content, animates open/close, and supports drag-to-resize on desktop. This replaced an older `PanelWrapper` (`react-resizable-panels` + a `vaul` mobile `Sheet`) — that component is deleted; if you see `PanelWrapper`, `panelDefaultSize`, `isProjectPanelOpen`, or `setProjectPanelOpen` referenced anywhere, it's describing the retired system. See the `page-component` skill for the current one.

### Task identifiers
Every displayed task identifier is `formatTaskKey(orgShortId, taskShortId)` from `@repo/util` (e.g. `SAY-123`) — no `#` prefix, and never a bare `task.shortId`. Route params still use the raw numeric `shortId`; only display text uses the formatted key. `apps/start/src/components/tasks/shared/identifier.tsx` (`GlobalTaskIdentifier`) is the canonical clickable-badge component when a link is appropriate.

### Edition System
Sayr has three editions: `cloud` (hosted sayr.io), `community` (free self-host), `enterprise` (licensed self-host). The `@repo/edition` package is the single source of truth for edition detection, capabilities, and plan limits. Import from `@repo/edition` in server-side code; use `import.meta.env.VITE_SAYR_EDITION` in client-side React components. See the `edition` skill for full API reference, patterns, and rules.

## Database Schema

**Core tables**: `user`, `session`, `organization`, `member`, `task`, `taskAssignee`, `taskComment`, `taskTimeline`, `label`, `category`, `githubRepository`, `githubIssue`

**Task statuses**: `backlog`, `todo`, `in-progress`, `done`, `canceled`
**Priority levels**: `none`, `low`, `medium`, `high`, `urgent`
**Visibility**: `public`, `private` (per-item granularity)

## Cursor Rules (.cursorrules in apps/start)

Install Shadcn components with:
```bash
pnpm dlx shadcn@latest add <component-name>
```

## Search before you build

Before adding a new type, function, component, or utility anywhere in this repo: **search for an existing one first.** Grep the target package/app for a similarly-named or similarly-purposed symbol before writing a new one; check `packages/util`, `packages/ui`, and the relevant skill below for shared helpers before hand-rolling logic. If you're fairly sure nothing existing covers your case, say so explicitly rather than silently adding something new. Concrete example from this repo's own history: the org-prefixed task-key format (`SAY-123`) already existed as an inline template literal on the "copy branch name" button before a shared `formatTaskKey()` helper was extracted into `@repo/util` and reused everywhere else the same format was needed — check for that kind of one-off-that-should-be-shared before duplicating a format/convention across files.

## Skills Directory

`.agents/skills/` contains specialized documentation, auto-discovered by any tool that supports the [Agent Skills](https://agentskills.io) open standard (OpenCode, Claude Code, Copilot, Cursor, Codex, and others). **Check relevant skills before making changes in their area.**

| Skill | Purpose |
|---|---|
| `page-header/` | `PageHeader` component (identity + toolbar zones), `UnifiedTaskView` integration, single-org vs cross-org patterns |
| `page-component/` | `Page` layout + panel system (`IndentDrawer`, `sidebar-store`) — adding/toggling/resizing a side panel |
| `command-palette/` | Cmd+K command palette — registering commands, sub-views, auto-drill, badges |
| `edition/` | Edition detection, capabilities, and plan limits (`@repo/edition`) |
| `document-feature/` | Writing user-facing docs for `apps/marketing`'s Starlight docs site |
| `update-pr/` | Generating a PR title/description from the diff |
| `agent-docs-maintenance/` | Checking `AGENTS.md`/skills for staleness, writing a new skill, updating an existing one |

## Agent Constraints

1. **Before commits**: Always ask user for confirmation, unless the user has explicitly granted standing permission to commit/push in the current conversation.
2. **Multi-step tasks**: Use the Task/Agent tool for complex refactoring or broad research.
3. **File search**: Use Grep for patterns, Glob for file names.
4. **Code reading**: Use the Read tool, not cat/head/tail.
5. **Edits**: Use the Edit tool, not sed/awk — sed in particular has repeatedly corrupted template-literal interpolations (`${...}`) in this repo when the `$` wasn't escaped; prefer Edit for anything containing a template literal.
6. **Avoid**: Creating unnecessary files, especially `.md` files, unless requested.
7. **Type checks**: Only run `pnpm check-types`/`tsc` when requested, not on your own accord — except as a verification step after an edit you're making, where diffing against a pre-edit baseline (not just eyeballing the count) is the reliable way to confirm you introduced zero new errors.
8. **Builds/lints**: Don't worry about running `pnpm build` on your own accord. Do run Biome format on files you touch (from inside the specific app/package dir — see Code Style above), since there's no repo-wide format pass to catch it later.
9. **Stay in scope.** Don't add dependencies, abstractions, features, or "while I'm in here" refactors beyond what was asked. If something extra is genuinely needed, say so and ask rather than just doing it.
10. **No `any`.** If the real type isn't obvious, derive it (`typeof`, `ReturnType<...>`, inference from the schema/query) or ask — don't type around the problem.

## Additional notices
- If you are aware of any changes that may require an update to our /legal pages, please let this be known. This includes changes to OAuth providers, cookies, managing account information, subprocessors, or any other relevant changes.
