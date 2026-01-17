---
title: Adding Features
description: A complete walkthrough for implementing new features in Sayr
sidebar:
   order: 5
---

This guide walks through the complete process of implementing a new feature in Sayr, from database schema to UI. We'll use a simplified example of adding a "task bookmark" feature to demonstrate each layer of the stack.

## Overview

A typical feature touches these layers:

1. **Database schema** - Define the data model
2. **Database functions** - CRUD operations
3. **Backend API route** - HTTP endpoint with auth/permissions
4. **Frontend fetch function** - API wrapper
5. **Frontend component** - User interface
6. **Real-time updates** - WebSocket broadcasting

## Step 1: Database Schema

Start in `packages/database/src/schema/` by creating or modifying schema files.

### Create a new schema file

```typescript
// packages/database/src/schema/taskBookmark.schema.ts
import { pgTable, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./user.schema";
import { task } from "./task.schema";
import { organization } from "./organization.schema";

export const taskBookmark = pgTable(
   "task_bookmark",
   {
      taskId: text("task_id")
         .notNull()
         .references(() => task.id, { onDelete: "cascade" }),
      userId: text("user_id")
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
      organizationId: text("organization_id")
         .notNull()
         .references(() => organization.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").defaultNow().notNull(),
   },
   (table) => ({
      pk: primaryKey({ columns: [table.taskId, table.userId] }),
   })
);
```

### Add relations

```typescript
// In the same file or a relations file
import { relations } from "drizzle-orm";

export const taskBookmarkRelations = relations(taskBookmark, ({ one }) => ({
   task: one(task, {
      fields: [taskBookmark.taskId],
      references: [task.id],
   }),
   user: one(user, {
      fields: [taskBookmark.userId],
      references: [user.id],
   }),
}));
```

### Export from schema index

```typescript
// packages/database/src/schema/index.ts
export * from "./taskBookmark.schema";

// Add type exports
export type TaskBookmark = typeof taskBookmark.$inferSelect;
export type NewTaskBookmark = typeof taskBookmark.$inferInsert;
```

### Apply to database

```bash
pnpm -F @repo/database db:push
```

## Step 2: Database Functions

Create CRUD functions in `packages/database/src/functions/`.

```typescript
// packages/database/src/functions/taskBookmark.ts
import { and, eq } from "drizzle-orm";
import { db, schema } from "..";

/**
 * Toggle a bookmark for a task. If it exists, remove it. If not, create it.
 *
 * @param taskId - The task to bookmark
 * @param userId - The user bookmarking
 * @param orgId - The organization context
 * @returns The bookmark if created, null if removed
 */
export async function toggleTaskBookmark(
   taskId: string,
   userId: string,
   orgId: string
): Promise<schema.TaskBookmark | null> {
   // Check if bookmark exists
   const existing = await db.query.taskBookmark.findFirst({
      where: and(
         eq(schema.taskBookmark.taskId, taskId),
         eq(schema.taskBookmark.userId, userId)
      ),
   });

   if (existing) {
      // Remove bookmark
      await db
         .delete(schema.taskBookmark)
         .where(
            and(
               eq(schema.taskBookmark.taskId, taskId),
               eq(schema.taskBookmark.userId, userId)
            )
         );
      return null;
   }

   // Create bookmark
   const [bookmark] = await db
      .insert(schema.taskBookmark)
      .values({ taskId, userId, organizationId: orgId })
      .returning();

   return bookmark;
}

/**
 * Get all bookmarked tasks for a user in an organization.
 */
export async function getUserBookmarks(
   userId: string,
   orgId: string
): Promise<schema.TaskBookmark[]> {
   return db.query.taskBookmark.findMany({
      where: and(
         eq(schema.taskBookmark.userId, userId),
         eq(schema.taskBookmark.organizationId, orgId)
      ),
      with: {
         task: true,
      },
   });
}

/**
 * Check if a user has bookmarked a specific task.
 */
export async function isTaskBookmarked(
   taskId: string,
   userId: string
): Promise<boolean> {
   const bookmark = await db.query.taskBookmark.findFirst({
      where: and(
         eq(schema.taskBookmark.taskId, taskId),
         eq(schema.taskBookmark.userId, userId)
      ),
   });
   return !!bookmark;
}
```

### Export functions

```typescript
// packages/database/src/index.ts
export * from "./functions/taskBookmark";
```

## Step 3: Backend API Route

Create or extend a route in `apps/backend/routes/api/`.

```typescript
// apps/backend/routes/api/task.ts (add to existing file)
import {
   toggleTaskBookmark,
   getUserBookmarks,
   hasOrgPermission,
} from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { broadcast, broadcastIndividual, findClientsByUserId } from "../ws";
import type { WSBaseMessage } from "@/routes/ws/types";

// Toggle bookmark endpoint
apiRouteAdminProjectTask.post("/bookmark", async (c) => {
   const traceAsync = createTraceAsync();
   const recordWideError = c.get("recordWideError");
   const session = c.get("session");

   // 1. Parse request
   const { org_id: orgId, task_id: taskId, wsClientId } = await c.req.json();

   // 2. Validate session
   if (!session?.userId) {
      return c.json({ success: false, error: "Not authenticated" }, 401);
   }

   // 3. Check permissions (optional - bookmarks might not need special perms)
   const isAuthorized = await traceAsync(
      "hasOrgPermission",
      () => hasOrgPermission(session.userId, orgId, "tasks.view"),
      { description: "Checking view permission for bookmarking" }
   );

   if (!isAuthorized) {
      return c.json({ success: false, error: "Permission denied" }, 401);
   }

   // 4. Perform the operation
   try {
      const bookmark = await traceAsync(
         "task.bookmark.toggle",
         () => toggleTaskBookmark(taskId, session.userId, orgId),
         {
            description: "Toggling task bookmark",
            data: { taskId, userId: session.userId },
         }
      );

      const isBookmarked = bookmark !== null;

      // 5. Broadcast to user's other sessions (optional)
      const userSockets = findClientsByUserId(session.userId);
      for (const socket of userSockets) {
         broadcastIndividual(
            socket,
            {
               type: "BOOKMARK_CHANGED" as WSBaseMessage["type"],
               data: { taskId, isBookmarked },
            },
            orgId
         );
      }

      // 6. Return response
      return c.json({
         success: true,
         data: { taskId, isBookmarked },
      });
   } catch (err) {
      await recordWideError({
         name: "task.bookmark.failed",
         error: err,
         code: "TASK_BOOKMARK_FAILED",
         message: "Failed to toggle bookmark",
         contextData: { taskId, userId: session.userId },
      });
      return c.json({ success: false, error: "Failed to toggle bookmark" }, 500);
   }
});
```

### Key patterns in the API route

| Step | Purpose |
|------|---------|
| Parse request | Extract data from `c.req.json()` |
| Validate session | Check `c.get("session")` exists |
| Check permissions | Use `hasOrgPermission()` for authorization |
| Wrap with tracing | Use `traceAsync()` for observability |
| Handle errors | Use `recordWideError()` for logging |
| Broadcast updates | Use `broadcast()` for real-time sync |

## Step 4: Frontend Fetch Function

Create API wrapper functions in `apps/start/src/lib/fetches/`.

```typescript
// apps/start/src/lib/fetches/task.ts (add to existing file)

const API_URL = import.meta.env.VITE_APP_ENV === "development"
   ? "/backend-api"
   : "/api";

/**
 * Toggle bookmark status for a task.
 *
 * @param organizationId - The organization the task belongs to
 * @param taskId - The task to bookmark/unbookmark
 * @param wsClientId - WebSocket client ID for real-time updates
 * @returns Promise with success status and bookmark state
 *
 * @example
 * ```ts
 * const result = await toggleBookmarkAction("org_123", "task_456", wsClientId);
 * if (result.success) {
 *   console.log("Bookmarked:", result.data.isBookmarked);
 * }
 * ```
 */
export async function toggleBookmarkAction(
   organizationId: string,
   taskId: string,
   wsClientId: string
): Promise<{ success: boolean; data?: { taskId: string; isBookmarked: boolean }; error?: string }> {
   const result = await fetch(`${API_URL}/admin/organization/task/bookmark`, {
      method: "POST",
      body: JSON.stringify({
         org_id: organizationId,
         task_id: taskId,
         wsClientId,
      }),
      headers: {
         "Content-Type": "application/json",
      },
      credentials: "include",
   }).then((res) => res.json());

   if (!result.success) {
      console.error("Failed to toggle bookmark", { error: result.error, taskId });
   }

   return result;
}
```

## Step 5: Frontend Component

Create the UI component in `apps/start/src/components/`.

```tsx
// apps/start/src/components/tasks/task/bookmark-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement";
import { toggleBookmarkAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";

interface BookmarkButtonProps {
   taskId: string;
   organizationId: string;
   initialBookmarked?: boolean;
}

export function BookmarkButton({
   taskId,
   organizationId,
   initialBookmarked = false,
}: BookmarkButtonProps) {
   // 1. Hooks first
   const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
   const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
   const { runWithToast, isFetching } = useToastAction();

   // 2. Handlers
   const handleToggle = async () => {
      if (isFetching) return;

      const result = await runWithToast(
         "bookmark-toggle",
         {
            loading: { title: "Updating bookmark..." },
            success: {
               title: isBookmarked ? "Bookmark removed" : "Bookmark added",
            },
            error: { title: "Failed to update bookmark" },
         },
         () => toggleBookmarkAction(organizationId, taskId, wsClientId)
      );

      if (result?.success && result.data) {
         setIsBookmarked(result.data.isBookmarked);
      }
   };

   // 3. Render
   return (
      <Button
         variant="ghost"
         size="sm"
         onClick={handleToggle}
         disabled={isFetching}
         aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
         {isBookmarked ? (
            <IconBookmarkFilled className="h-4 w-4 text-primary" />
         ) : (
            <IconBookmark className="h-4 w-4" />
         )}
      </Button>
   );
}
```

### Using the component

```tsx
// In a task detail page or task card
import { BookmarkButton } from "@/components/tasks/task/bookmark-button";

function TaskCard({ task, organization }) {
   return (
      <div className="flex items-center gap-2">
         <h3>{task.title}</h3>
         <BookmarkButton
            taskId={task.id}
            organizationId={organization.id}
            initialBookmarked={task.isBookmarked}
         />
      </div>
   );
}
```

## Step 6: Real-time Updates (WebSocket)

For features that need real-time sync across clients, add WebSocket message handling.

### Add message type

```typescript
// apps/backend/routes/ws/types.ts
export type WSMessageType =
   | "CREATE_TASK"
   | "UPDATE_TASK"
   | "DELETE_TASK"
   | "BOOKMARK_CHANGED"  // Add new type
   // ... other types
```

### Handle in frontend

```tsx
// In a component or context that manages WebSocket
useEffect(() => {
   const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      if (message.type === "BOOKMARK_CHANGED") {
         const { taskId, isBookmarked } = message.data;
         // Update local state
         setBookmarks((prev) =>
            isBookmarked
               ? [...prev, taskId]
               : prev.filter((id) => id !== taskId)
         );
      }
   };

   ws.addEventListener("message", handleMessage);
   return () => ws.removeEventListener("message", handleMessage);
}, []);
```

## Complete Feature Checklist

Before submitting your PR, verify:

- [ ] Database schema created and exported
- [ ] Relations defined if needed
- [ ] Database functions with JSDoc comments
- [ ] Functions exported from `packages/database/src/index.ts`
- [ ] API route with permission checking
- [ ] Error handling with `recordWideError()`
- [ ] Tracing with `createTraceAsync()`
- [ ] Frontend fetch function with JSDoc
- [ ] React component following structure guidelines
- [ ] WebSocket broadcasting (if real-time needed)
- [ ] Types exported for consumers
- [ ] `pnpm lint` passes
- [ ] `pnpm check-types` passes

## Common Patterns Reference

### Permission check

```typescript
const isAuthorized = await hasOrgPermission(session.userId, orgId, "tasks.create");
if (!isAuthorized) {
   return c.json({ success: false, error: "Permission denied" }, 401);
}
```

### Error recording

```typescript
await recordWideError({
   name: "feature.action.failed",
   error: err,
   code: "FEATURE_ACTION_FAILED",
   message: "Human readable message",
   contextData: { relevantIds },
});
```

### Broadcast to channel

```typescript
broadcast(orgId, "tasks", { type: "UPDATE_TASK", data: task }, wsClientId);
```

### Toast with loading state

```typescript
const { runWithToast, isFetching } = useToastAction();

const result = await runWithToast(
   "unique-toast-id",
   {
      loading: { title: "Working..." },
      success: { title: "Done!" },
      error: { title: "Failed" },
   },
   () => apiCall()
);
```

## File Locations Summary

| Layer | Location |
|-------|----------|
| Schema | `packages/database/src/schema/` |
| DB functions | `packages/database/src/functions/` |
| API routes | `apps/backend/routes/api/` |
| Fetch functions | `apps/start/src/lib/fetches/` |
| Components | `apps/start/src/components/` |
| WS types | `apps/backend/routes/ws/types.ts` |

## Related Guides

- [Architecture Overview](/docs/contributing/architecture) — Understand how the systems connect
- [Database Guide](/docs/contributing/database) — Detailed Drizzle ORM patterns
- [Code Style Guide](/docs/contributing/guidelines/code-style) — Coding conventions and error handling
- [Testing Guide](/docs/contributing/guidelines/testing) — Writing tests for your feature
- [Pull Request Guidelines](/docs/contributing/guidelines/pull-requests) — Submitting your changes
