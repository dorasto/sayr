---
title: Code Style Guide
description: Coding conventions and best practices for contributing to Sayr
sidebar:
   order: 3
---

This guide covers the coding standards and conventions used throughout the Sayr codebase. Following these guidelines ensures consistency and makes code reviews smoother.

## Formatting with Biome

Sayr uses [Biome](https://biomejs.dev/) for linting and formatting. Run these commands before committing:

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Configuration

| Setting | Value |
|---------|-------|
| Indent style | Tabs |
| Indent width | 3 |
| Line width | 120 characters |
| Quote style | Double quotes |
| Semicolons | Always |
| Trailing commas | ES5 style |
| Arrow parentheses | Always |

## Import Organization

Imports should be organized in three groups, separated by blank lines:

```typescript
// 1. Workspace packages - always use @repo/* alias
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
```

:::caution[Never use relative paths for packages]
Always use `@repo/*` for workspace packages, never relative paths like `../../packages/database`.
:::

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/functions | camelCase | `orgId`, `getTaskById`, `isAuthorized` |
| Types/interfaces | PascalCase | `TaskContentProps`, `AppEnv` |
| Components | PascalCase | `TaskContent`, `SubWrapper` |
| Route handlers | camelCase with prefix | `apiRouteAdminOrganization` |
| Error codes | UPPER_SNAKE_CASE | `TASK_CREATION_FAILED` |
| Database enums | camelCase | `statusEnum`, `visibleEnum` |

## TypeScript Best Practices

### Use Explicit Types

Avoid `any` - the linter will warn you. Use explicit types instead:

```typescript
// Bad
const handleData = (data: any) => { ... }

// Good
interface TaskData {
   id: string;
   title: string;
   status: TaskStatus;
}
const handleData = (data: TaskData) => { ... }
```

### Use Type Imports

Use `import type` for type-only imports to improve build performance:

```typescript
// Good
import type { AppEnv } from "@/index";
import type { TaskWithLabels } from "@repo/database";

// Also good - mixed import
import { db, schema, type TaskWithLabels } from "@repo/database";
```

### Drizzle Type Inference

Use Drizzle's built-in type inference for database types:

```typescript
// Schema types
type Task = typeof schema.task.$inferSelect;
type NewTask = typeof schema.task.$inferInsert;

// Extended types are defined in packages/database/src/schema/index.ts
import type { TaskWithLabels, OrganizationWithMembers } from "@repo/database";
```

## React Component Structure

Follow this structure for React components:

```typescript
"use client"; // if needed

// Imports organized as described above
import { Button } from "@repo/ui/components/button";
import { useState, useEffect } from "react";

// Interface definition
interface TaskContentProps {
   task: TaskWithLabels;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

// Component
export function TaskContent({ task, open, onOpenChange }: TaskContentProps) {
   // 1. Hooks first
   const [state, setState] = useState<string>("");
   const router = useRouter();

   // 2. Effects
   useEffect(() => {
      // effect logic
   }, []);

   // 3. Handlers
   const handleSubmit = async () => {
      // handler logic
   };

   // 4. Render
   return (
      <div>
         {/* component JSX */}
      </div>
   );
}
```

### Context Hook Pattern

When creating context hooks, throw descriptive errors:

```typescript
export function useLayoutOrganization() {
   const context = useContext(LayoutOrganizationContext);
   if (context === undefined) {
      throw new Error(
         "useLayoutOrganization must be used within RootProviderOrganization"
      );
   }
   return context;
}
```

## Error Handling

### Backend Error Pattern

Use `recordWideError` for consistent error logging and tracking:

```typescript
try {
   const task = await createTask(data);
   
   if (!task) {
      await recordWideError({
         name: "task.create.failed",           // dotted notation for categorization
         error: new Error("Task creation failed"),
         code: "TASK_CREATION_FAILED",         // UPPER_SNAKE_CASE code
         message: "Failed to create task in database",
         contextData: { orgId, title },        // relevant context for debugging
      });
      return c.json({ success: false, error: "Failed to create task" }, 500);
   }
   
   return c.json({ success: true, data: task });
} catch (err) {
   await recordWideError({
      name: "task.create.exception",
      error: err,
      code: "TASK_CREATION_EXCEPTION",
      message: "Unexpected error creating task",
      contextData: { orgId, title },
   });
   return c.json({ success: false, error: "An unexpected error occurred" }, 500);
}
```

### Error Naming Convention

Use dotted notation for error names that follows this pattern:

```
{resource}.{action}.{result}
```

Examples:
- `task.create.failed`
- `organization.update.slug_taken`
- `label.delete.not_found`
- `member.invite.email_exists`

## API Route Structure

Hono route handlers should follow this pattern:

```typescript
apiRouteAdminOrganization.post("/create-label", async (c) => {
   // 1. Setup tracing and error handling
   const traceAsync = createTraceAsync();
   const recordWideError = c.get("recordWideError");
   const session = c.get("session");

   // 2. Parse request body
   const { org_id: orgId, wsClientId, name, color } = await c.req.json();

   // 3. Check permissions
   const isAuthorized = await traceAsync(
      "hasOrgPermission",
      () => hasOrgPermission(session?.userId || "", orgId, "content.manageLabels"),
      { description: "Checking permissions" }
   );

   if (!isAuthorized) {
      return c.json({ success: false, error: "Permission denied" }, 401);
   }

   // 4. Perform the operation
   const label = await traceAsync(
      "label.create",
      () => createLabel({ organizationId: orgId, name, color }),
      { description: "Creating label" }
   );

   // 5. Handle errors
   if (!label) {
      await recordWideError({
         name: "label.create.failed",
         error: new Error("Label creation failed"),
         code: "LABEL_CREATION_FAILED",
         message: "Failed to create label",
         contextData: { orgId, name },
      });
      return c.json({ success: false, error: "Failed to create label" }, 500);
   }

   // 6. Broadcast updates (if real-time)
   broadcast(orgId, "admin", { type: "CREATE_LABEL", data: label }, wsClientId);

   // 7. Return success
   return c.json({ success: true, data: label });
});
```

## WebSocket Broadcasting

When data changes need to be pushed to clients in real-time:

```typescript
import { broadcast, broadcastPublic, broadcastIndividual } from "@/routes/ws";

// Broadcast to a specific channel (e.g., "tasks", "admin")
broadcast(orgId, "tasks", { type: "UPDATE_TASK", data: task }, excludeSocket);

// Broadcast to the public channel (for public board viewers)
broadcastPublic(orgId, { type: "UPDATE_TASK", data: task });

// Broadcast to a specific user's socket
broadcastIndividual(socket, { type: "NOTIFICATION", data: notification }, orgId);
```

### Message Types

WebSocket message types are defined as constants:

```typescript
type: "CREATE_TASK" as WSBaseMessage["type"]
type: "UPDATE_TASK" as WSBaseMessage["type"]
type: "DELETE_TASK" as WSBaseMessage["type"]
```

## Tracing with OpenTelemetry

Wrap important operations with tracing for observability:

```typescript
const traceAsync = createTraceAsync();

const result = await traceAsync(
   "operation.name",              // span name
   () => performOperation(),      // the operation to trace
   {
      description: "Human readable description",
      data: { relevantContext },
      onSuccess: (result) => ({
         description: "Operation succeeded",
         data: { resultId: result.id },
      }),
   }
);
```

## Comments and Documentation

### When to Comment

- Complex business logic that isn't immediately obvious
- Workarounds for known issues (include issue link if available)
- Public API functions (use JSDoc)

### JSDoc for Functions

```typescript
/**
 * Fetches all tasks for a given organization with related data.
 *
 * @param orgId - The organization ID
 * @returns Array of tasks with labels, assignees, and comments
 */
export async function getTasksByOrganizationId(
   orgId: string
): Promise<TaskWithLabels[]> {
   // implementation
}
```

## Pre-commit Checklist

Before committing, ensure:

1. `pnpm lint` passes with no errors
2. `pnpm check-types` passes with no type errors
3. Any new code follows the patterns in this guide
4. Complex logic has appropriate comments
5. No `console.log` statements left in production code
