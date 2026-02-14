# AGENTS.md - Sayr Project Management Platform

## Overview
Turborepo monorepo for Sayr.io, a collaborative project management platform. Uses pnpm for package management, Biome for linting/formatting, TypeScript throughout, and Bun runtime for backend services.

## Commands

### Development
```bash
pnpm dev                          # Start all apps (backend :5468, start :3000, marketing :3002)
pnpm dev:op                       # Start with 1Password secret injection
pnpm -F backend dev               # Backend only
pnpm -F start dev                 # Frontend (TanStack Start) only
pnpm -F marketing dev             # Marketing site only
pnpm -F worker dev                # GitHub webhook processor only
```

### Build & Quality
```bash
pnpm build                        # Build all apps
pnpm lint                         # Run Biome linting
pnpm lint:fix                     # Fix lint issues
pnpm format-write                 # Format with Biome (or: biome format --write .)
pnpm check-types                  # TypeScript type checking (turbo check-types)
```

### Database (packages/database)
```bash
pnpm -F @repo/database db:push    # Apply schema to PostgreSQL
pnpm -F @repo/database db:studio  # Open Drizzle Studio
```

### Testing
```bash
pnpm -F start test                # Run all tests (vitest)
pnpm -F start test -- --testNamePattern="pattern"   # Run tests matching pattern
pnpm -F start test -- path/to/file.test.ts          # Run specific test file
```

## Architecture

```
apps/
  backend/     # Hono API server on Bun (REST + WebSocket, port 5468)
  start/       # TanStack Start frontend with React 19 (port 3000)
  marketing/   # Astro marketing site with Starlight docs (port 3002)
  worker/      # GitHub webhook queue processor (Bun)

packages/
  auth/        # Better Auth config (GitHub + Doras OAuth)
  database/    # Drizzle ORM schemas and CRUD functions (PostgreSQL)
  storage/     # MinIO S3-compatible client with obfuscated filenames
  ui/          # Shadcn/ui component library
  util/        # Shared utilities (date formatting, slugs, CDN URLs)
  queue/       # Job queue abstraction (Redis or file-based)
  opentelemetry/ # Tracing and observability utilities
```

## Code Style (Biome)

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
All admin pages must use a consistent `PageHeader` component (`h-11`, sticky, two zones: Identity left + Toolbar right). Task list pages integrate `UnifiedTaskView` which supports both single-org and cross-org modes. See `.claude/skills/page-header/SKILL.md` for full patterns and props reference.

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

## Agent Behavior Guidelines

1. **Before commits**: Always ask user for confirmation
2. **Multi-step tasks**: Use Task tool for complex refactoring
3. **File search**: Use Grep for patterns, Glob for file names
4. **Code reading**: Use Read tool, not cat/head/tail
5. **Edits**: Use Edit tool, not sed/awk
6. **Avoid**: Creating unnecessary files, especially .md files unless requested
7. **ONLY** do type checks like pnpm tsc etc when requested, don't do it on your own accord.
8. **Do not** a worry about running pnpm builds, lints, etc.
