---
title: Architecture Overview
description: Understanding how Sayr's systems work together
sidebar:
   order: 2
---

This guide explains the high-level architecture of Sayr, how the different packages interact, and the flow of data through the system.

## System Overview

Sayr is built as a monorepo with multiple applications and shared packages:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│     apps/start          │   │    apps/marketing       │
│   (TanStack Start)      │   │       (Astro)           │
│     Port 3000           │   │      Port 3002          │
└───────────┬─────────────┘   └─────────────────────────┘
            │
            │ HTTP + WebSocket
            ▼
┌─────────────────────────┐
│     apps/backend        │
│   (Hono on Bun)         │
│     Port 5468           │
└───────────┬─────────────┘
            │
    ┌───────┼───────┐
    ▼       ▼       ▼
┌───────┐ ┌─────┐ ┌───────┐
│  DB   │ │Redis│ │ MinIO │
│(Postgres)│     │ │  (S3) │
└───────┘ └─────┘ └───────┘
```

## Applications

### apps/start (Frontend)

The main user-facing application built with:
- **TanStack Start** - Full-stack React framework
- **React 19** - UI library
- **TanStack Router** - Type-safe routing
- **Shadcn/ui** - Component library (via `@repo/ui`)

Key responsibilities:
- User authentication flows
- Organization management UI
- Task boards and management
- Real-time updates via WebSocket

### apps/backend (API Server)

The backend API server built with:
- **Hono** - Fast web framework
- **Bun** - JavaScript runtime
- **WebSocket** - Real-time communication

Key responsibilities:
- REST API endpoints
- WebSocket connections for real-time updates
- Authentication session management
- Business logic and validation

### apps/worker (Background Jobs)

Processes background jobs and webhooks:
- **GitHub webhook processing** - Syncs issues, PRs
- **Queue consumption** - Handles async tasks

### apps/marketing (Documentation & Marketing)

Static site for docs and marketing:
- **Astro** - Static site generator
- **Starlight** - Documentation theme

## Shared Packages

### @repo/database

Central database package using Drizzle ORM:

```typescript
// Schema definitions
import { schema } from "@repo/database";

// Database client
import { db } from "@repo/database";

// CRUD functions
import { getTaskById, createTask, updateTask } from "@repo/database";

// Types
import type { TaskWithLabels, OrganizationWithMembers } from "@repo/database";
```

### @repo/auth

Authentication configuration using Better Auth:

```typescript
import { auth } from "@repo/auth";
```

Supports:
- GitHub OAuth
- Doras OAuth (internal)
- Session management

### @repo/ui

Shared component library based on Shadcn/ui:

```typescript
import { Button } from "@repo/ui/components/button";
import { Dialog } from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
```

### @repo/storage

File storage client for MinIO/S3:

```typescript
import { uploadFile, getFileUrl } from "@repo/storage";
```

### @repo/queue

Job queue abstraction:

```typescript
import { enqueue, processQueue } from "@repo/queue";
```

### @repo/util

Shared utilities:

```typescript
import { generateSlug, formatDate, ensureCdnUrl } from "@repo/util";
```

## Data Flow

### Request Flow (REST API)

```
1. Client makes HTTP request
   └─► apps/start (TanStack Start)

2. Server function calls backend
   └─► apps/backend (Hono API)

3. Backend validates & processes
   ├─► Check authentication (session)
   ├─► Check permissions (hasOrgPermission)
   └─► Execute business logic

4. Database operations
   └─► @repo/database (Drizzle ORM)
       └─► PostgreSQL

5. Response returns through chain
   └─► Client receives data
```

### Real-time Updates (WebSocket)

```
1. Client connects to WebSocket
   └─► apps/backend /ws endpoint

2. Client subscribes to channels
   └─► "tasks", "admin", "public"

3. When data changes (e.g., task created):
   ├─► Backend broadcasts to channel
   │   broadcast(orgId, "tasks", { type: "CREATE_TASK", data })
   │
   └─► All subscribed clients receive update
       └─► Client updates local state
```

### Authentication Flow

```
1. User clicks "Sign in with GitHub"
   └─► Redirects to GitHub OAuth

2. GitHub redirects back with code
   └─► apps/backend /api/auth/callback/github

3. Backend exchanges code for tokens
   └─► @repo/auth validates & creates session

4. Session stored in database
   └─► @repo/database (session table)

5. Client receives session cookie
   └─► Subsequent requests authenticated
```

## Permission System

Sayr uses a team-based permission system:

```
Organization
    └─► Teams (with permission sets)
        └─► Members (users assigned to teams)
```

### Permission Categories

| Category | Permissions |
|----------|-------------|
| `admin` | `administrator`, `manageMembers`, `manageTeams`, `manageSettings` |
| `content` | `manageLabels`, `manageCategories` |
| `tasks` | `create`, `edit`, `delete`, `assign` |

### Permission Checking

```typescript
// In API routes
const isAuthorized = await hasOrgPermission(
   session.userId,
   orgId,
   "tasks.create"  // category.permission
);

if (!isAuthorized) {
   return c.json({ error: "Permission denied" }, 401);
}
```

The `administrator` permission grants full access to all other permissions.

## WebSocket Channels

| Channel | Purpose | Subscribers |
|---------|---------|-------------|
| `tasks` | Task updates | Users viewing task board |
| `admin` | Admin updates | Users in admin panel |
| `public` | Public board updates | Anonymous viewers |

### Message Types

```typescript
type WSMessageType =
   | "CREATE_TASK"
   | "UPDATE_TASK"
   | "DELETE_TASK"
   | "CREATE_LABEL"
   | "UPDATE_LABEL"
   | "DELETE_LABEL"
   // ... more types
```

## Database Schema Overview

### Core Entities

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     user     │────►│    member    │◄────│ organization │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │     team     │
                     └──────────────┘
```

### Task Relationships

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     task     │────►│ taskAssignee │◄────│     user     │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ├────►┌──────────────┐     ┌──────────────┐
       │     │  taskLabel   │◄────│    label     │
       │     └──────────────┘     └──────────────┘
       │
       └────►┌──────────────┐
             │ taskComment  │
             └──────────────┘
```

## Environment Configuration

### Frontend (apps/start)

```env
VITE_URL_ROOT=http://admin.app.localhost:3000
VITE_ROOT_DOMAIN=app.localhost
VITE_PROJECT_NAME=Sayr
```

### Backend (apps/backend)

```env
DATABASE_URL=postgresql://...
STORAGE_URL=http://localhost:9000
INTERNAL_SECRET=...
```

### Shared

Both apps need access to:
- Database connection
- Auth configuration
- Storage credentials

## Tracing and Observability

Sayr uses OpenTelemetry for distributed tracing:

```typescript
import { createTraceAsync } from "@repo/opentelemetry";

const traceAsync = createTraceAsync();

const result = await traceAsync(
   "task.create",
   () => createTask(data),
   { description: "Creating new task" }
);
```

Traces are sent to Axiom (when configured) for analysis and debugging.

## Key Design Decisions

### Why Turborepo?

- **Shared code** - Common packages used across apps
- **Parallel builds** - Faster CI/CD pipelines
- **Consistent tooling** - Same linting/formatting everywhere

### Why Bun for Backend?

- **Performance** - Faster startup and execution
- **Native TypeScript** - No build step needed
- **WebSocket support** - Built-in, performant WebSockets

### Why TanStack Start?

- **Full-stack** - Server functions + client rendering
- **Type-safe routing** - Catch errors at compile time
- **React 19** - Latest React features

### Why Drizzle ORM?

- **Type-safe queries** - Full TypeScript inference
- **SQL-like syntax** - Familiar to SQL developers
- **Performance** - Lightweight, fast queries

## Related Guides

- [Local Development](/docs/contributing/local-development) — Set up your development environment
- [Database Guide](/docs/contributing/database) — Detailed Drizzle ORM patterns and queries
- [Adding Features](/docs/contributing/adding-features) — End-to-end feature implementation walkthrough
- [Code Style Guide](/docs/contributing/guidelines/code-style) — Coding conventions and best practices
