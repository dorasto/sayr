---
title: Database Guide
description: Working with the database using Drizzle ORM
sidebar:
   order: 4
---

Sayr uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL for all database operations. This guide covers how to work with the database effectively.

## Package Structure

Database code lives in `packages/database`:

```
packages/database/
├── src/
│   ├── index.ts           # Main exports (db client, helpers)
│   ├── schema/            # Table definitions
│   │   ├── index.ts       # Schema exports & extended types
│   │   ├── user.ts        # User & session tables
│   │   ├── organization.ts # Organization & member tables
│   │   ├── task.ts        # Task & related tables
│   │   └── ...
│   └── functions/         # CRUD operations
│       ├── task.ts
│       ├── organization.ts
│       └── ...
├── drizzle.config.ts      # Drizzle configuration
└── package.json
```

## Importing

```typescript
// Database client and schema
import { db, schema } from "@repo/database";

// CRUD functions
import { getTaskById, createTask, updateTask } from "@repo/database";

// Types
import type { TaskWithLabels, OrganizationWithMembers } from "@repo/database";

// Drizzle operators (for custom queries)
import { eq, and, or, inArray } from "drizzle-orm";
```

## Schema Definitions

### Defining Tables

```typescript
// packages/database/src/schema/task.ts
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { organization } from "./organization";
import { user } from "./user";

export const statusEnum = pgEnum("status", [
   "backlog",
   "todo",
   "in-progress",
   "done",
   "canceled",
]);

export const task = pgTable("task", {
   id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
   organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
   title: text("title").notNull(),
   description: text("description"),
   status: statusEnum("status").default("backlog"),
   createdById: text("created_by_id").references(() => user.id),
   createdAt: timestamp("created_at").defaultNow(),
   updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Defining Relations

```typescript
import { relations } from "drizzle-orm";

export const taskRelations = relations(task, ({ one, many }) => ({
   organization: one(organization, {
      fields: [task.organizationId],
      references: [organization.id],
   }),
   createdBy: one(user, {
      fields: [task.createdById],
      references: [user.id],
   }),
   labels: many(taskLabel),
   assignees: many(taskAssignee),
   comments: many(taskComment),
}));
```

## Type Inference

Drizzle provides type inference for your schema:

```typescript
// Infer types from schema
type Task = typeof schema.task.$inferSelect;      // SELECT result type
type NewTask = typeof schema.task.$inferInsert;   // INSERT input type
```

### Extended Types

For queries with relations, define extended types in `packages/database/src/schema/index.ts`:

```typescript
// Task with all related data loaded
export type TaskWithLabels = typeof task.$inferSelect & {
   labels: (typeof label.$inferSelect)[];
   assignees: {
      id: string;
      name: string;
      image: string | null;
   }[];
   createdBy: {
      id: string;
      name: string;
      image: string | null;
   } | null;
   comments: (typeof taskComment.$inferSelect & {
      createdBy: {
         id: string;
         name: string;
         image: string | null;
      } | null;
   })[];
};
```

## Query Patterns

### Simple Queries

```typescript
// Find one by ID
const task = await db.query.task.findFirst({
   where: (t) => eq(t.id, taskId),
});

// Find many with conditions
const tasks = await db.query.task.findMany({
   where: (t) => and(
      eq(t.organizationId, orgId),
      eq(t.status, "in-progress")
   ),
});
```

### Queries with Relations

```typescript
const task = await db.query.task.findFirst({
   where: (t) => eq(t.id, taskId),
   with: {
      labels: {
         with: {
            label: true,  // Load the actual label object
         },
      },
      createdBy: {
         columns: {
            id: true,
            name: true,
            image: true,
         },
      },
      assignees: {
         with: {
            user: {
               columns: {
                  id: true,
                  name: true,
                  image: true,
               },
            },
         },
      },
   },
});
```

### Select Specific Columns

```typescript
const users = await db
   .select({
      id: user.id,
      name: user.name,
      email: user.email,
   })
   .from(user)
   .where(eq(user.organizationId, orgId));
```

### Joins

```typescript
const tasksWithOrgs = await db
   .select({
      task: task,
      orgName: organization.name,
   })
   .from(task)
   .innerJoin(organization, eq(task.organizationId, organization.id))
   .where(eq(task.status, "done"));
```

## Insert Operations

### Single Insert

```typescript
const [newTask] = await db
   .insert(schema.task)
   .values({
      organizationId: orgId,
      title: "New Task",
      description: "Task description",
      createdById: userId,
   })
   .returning();
```

### Bulk Insert

```typescript
const newLabels = await db
   .insert(schema.label)
   .values([
      { organizationId: orgId, name: "Bug", color: "#ff0000" },
      { organizationId: orgId, name: "Feature", color: "#00ff00" },
      { organizationId: orgId, name: "Docs", color: "#0000ff" },
   ])
   .returning();
```

## Update Operations

```typescript
const [updated] = await db
   .update(schema.task)
   .set({
      title: "Updated Title",
      status: "done",
      updatedAt: new Date(),
   })
   .where(eq(schema.task.id, taskId))
   .returning();
```

### Conditional Updates

```typescript
await db
   .update(schema.task)
   .set({ status: "canceled" })
   .where(
      and(
         eq(schema.task.organizationId, orgId),
         eq(schema.task.status, "backlog")
      )
   );
```

## Delete Operations

```typescript
// Delete single record
await db
   .delete(schema.task)
   .where(eq(schema.task.id, taskId));

// Delete with conditions
await db
   .delete(schema.taskLabel)
   .where(
      and(
         eq(schema.taskLabel.taskId, taskId),
         eq(schema.taskLabel.labelId, labelId)
      )
   );
```

## CRUD Function Pattern

Create reusable functions in `packages/database/src/functions/`:

```typescript
// packages/database/src/functions/task.ts
import { db, schema } from "../index";
import { eq, and } from "drizzle-orm";
import type { TaskWithLabels } from "../schema";

/**
 * Fetches a single task by ID with all related data.
 */
export async function getTaskById(
   taskId: string
): Promise<TaskWithLabels | null> {
   const task = await db.query.task.findFirst({
      where: (t) => eq(t.id, taskId),
      with: {
         labels: { with: { label: true } },
         assignees: { with: { user: { columns: { id: true, name: true, image: true } } } },
         createdBy: { columns: { id: true, name: true, image: true } },
         comments: { with: { createdBy: { columns: { id: true, name: true, image: true } } } },
      },
   });

   if (!task) return null;

   // Transform join tables to clean arrays
   return {
      ...task,
      labels: task.labels.map((l) => l.label),
      assignees: task.assignees.map((a) => a.user),
   } as TaskWithLabels;
}

/**
 * Creates a new task.
 */
export async function createTask(data: {
   organizationId: string;
   title: string;
   description?: string;
   createdById: string;
}): Promise<typeof schema.task.$inferSelect | null> {
   const [task] = await db
      .insert(schema.task)
      .values(data)
      .returning();

   return task ?? null;
}

/**
 * Updates a task by ID.
 */
export async function updateTask(
   taskId: string,
   data: Partial<typeof schema.task.$inferInsert>
): Promise<typeof schema.task.$inferSelect | null> {
   const [updated] = await db
      .update(schema.task)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.task.id, taskId))
      .returning();

   return updated ?? null;
}
```

## Database Commands

### Apply Schema Changes

After modifying schema files, push changes to the database:

```bash
pnpm -F @repo/database db:push
```

### Open Drizzle Studio

Visual database browser:

```bash
pnpm -F @repo/database db:studio
```

### Generate Migrations (if needed)

```bash
pnpm -F @repo/database db:generate
```

## Common Patterns

### Soft Deletes

Instead of deleting, mark records as deleted:

```typescript
// Schema
export const task = pgTable("task", {
   // ... other fields
   deletedAt: timestamp("deleted_at"),
});

// Query - exclude deleted
const tasks = await db.query.task.findMany({
   where: (t) => isNull(t.deletedAt),
});

// Soft delete
await db
   .update(schema.task)
   .set({ deletedAt: new Date() })
   .where(eq(schema.task.id, taskId));
```

### Pagination

```typescript
const PAGE_SIZE = 20;

const tasks = await db.query.task.findMany({
   where: (t) => eq(t.organizationId, orgId),
   limit: PAGE_SIZE,
   offset: page * PAGE_SIZE,
   orderBy: (t, { desc }) => desc(t.createdAt),
});
```

### Transactions

```typescript
await db.transaction(async (tx) => {
   // All operations use `tx` instead of `db`
   const [task] = await tx
      .insert(schema.task)
      .values({ title: "New Task", organizationId: orgId })
      .returning();

   await tx
      .insert(schema.taskLabel)
      .values({ taskId: task.id, labelId: labelId });

   // If any operation fails, all are rolled back
});
```

## Best Practices

1. **Always use CRUD functions** - Don't write raw queries in API routes; use functions from `packages/database/src/functions/`

2. **Return `null` for not found** - Functions should return `null` when records don't exist, not throw errors

3. **Use type inference** - Let Drizzle infer types from schema rather than manually defining them

4. **Keep relations lean** - Only load the columns you need in relations using `columns: {}`

5. **Transform join tables** - Map join table results to clean arrays in your functions

6. **Update `updatedAt`** - Always set `updatedAt: new Date()` in update operations

## Related Guides

- [Architecture Overview](/docs/contributing/architecture) — How the database fits into the system
- [Adding Features](/docs/contributing/adding-features) — Complete walkthrough including database layer
- [Code Style Guide](/docs/contributing/guidelines/code-style) — Naming conventions and TypeScript practices
