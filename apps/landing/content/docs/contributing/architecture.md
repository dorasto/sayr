---
title: Architecture Overview
description: Understanding how Sayr's systems work together
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
            │ HTTP + SSE
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
- Real-time updates via SSE

### apps/backend (API Server)

The backend API server built with:
- **Hono** - Fast web framework
- **Bun** - JavaScript runtime
- **SSE** - Real-time communication

Key responsibilities:
- REST API endpoints
- SSE connections for real-time updates
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
   └─► apps/backend (Hono API)

2. Global middleware
   ├─► Parse cookies / headers
   └─► Load & validate session
       └─► Attach user/session to context

3. Route handler executes
   ├─► Route-specific authorization check
   │   └─► hasOrgPermission / ownership / scope
   ├─► Route-specific input validation
   └─► Execute business logic

4. Database operations
   └─► @repo/database (Drizzle ORM)
       └─► PostgreSQL

5. Response returns
   └─► apps/backend → Client
```

### Real-time Updates (SSE)

```
1. Client initiates SSE connection
   └─► apps/backend /api/events

2. Server accepts connection
   ├─► Generate sseClientId (unique per connection)
   ├─► Create connection metadata entry (SSEClients)
   │     ├─► connectedAt
   │     ├─► heartbeat state (lastPing / lastPong / latency)
   │     └─► rate‑limit state (lastMessageAt / offenceCount)
   └─► Attempt session lookup from request headers
       ├─► Authenticated → clientId = user.id
       └─► Unauthenticated → clientId = "ANONYMOUS"

3. Server sends connection status
   └─► CONNECTION_STATUS
       ├─► authenticated: true | false
       └─► sseClientId

4. Initial server‑side subscription (best‑effort)
   ├─► If `orgId` query param is present
   │   └─► Auto‑subscribe to `${orgId}:public`
   └─► Otherwise
       └─► Subscribe to default/public or waiting room

   (Note: this does not grant access to private channels)

5. Client explicitly subscribes to channels
   └─► SSE message:
       {
         type: "SUBSCRIBE",
         orgId,
         channel
       }

6. Per‑SUBSCRIBE authorization (route‑level)
   ├─► Rate‑limit check (MIN_MESSAGE_INTERVAL)
   ├─► Waiting‑room enforcement
   │   └─► Only SUBSCRIBE / UNSUBSCRIBE / PONG allowed
   ├─► Channel access rules
   │   ├─► public
   │   │   └─► Allowed for anonymous clients
   │   ├─► private org channels
   │   │   ├─► Requires valid session
   │   │   └─► safeGetOrganization(orgId, userId)
   │   └─► admin channels
   │       └─► Requires user.role === "admin"
   └─► On failure
       ├─► Send ERROR
       └─► Optionally close socket

7. Subscription state update
   ├─► Unsubscribe from any previous rooms
   ├─► Add client to rooms[`${orgId}:${channel}`]
   ├─► Send SUBSCRIBED (INDIVIDUAL)
   └─► Broadcast USER_SUBSCRIBED (CHANNEL)

8. Backend data mutation occurs
   └─► Example: task created / updated
       └─► broadcast(orgId, "tasks", {
             type: "CREATE_TASK",
             data
           })

9. Broadcast fan‑out
   ├─► Resolve rooms[`${orgId}:tasks`]
   ├─► Skip sender if applicable
   ├─► Attach metadata
   │   ├─► ts
   │   ├─► orgId
   │   └─► channel
   └─► Send message with scope = "CHANNEL"

10. Client receives broadcast
    ├─► Validate orgId / channel relevance
    └─► Update local application state

11. Heartbeat & liveness management (parallel)
    ├─► Server sends PING every 30 seconds
    ├─► Client replies with PONG
    ├─► RTT / latency tracked per connection
    └─► Server closes sockets with no PONG after 60 seconds

12. Disconnect / unsubscribe lifecycle
    ├─► Triggered by close, error, rate‑limit, or timeout
    ├─► Remove client from all rooms
    ├─► Broadcast USER_UNSUBSCRIBED to affected channels
    └─► Remove SEEClients entry and release resources
```

### Authentication Flow

```
1. User clicks "Sign in with GitHub"
   └─► App sets `login_origin` cookie
   └─► Redirects to GitHub OAuth

2. GitHub redirects back with `code`
   └─► /api/auth/callback/github

3. Callback exchanges code for tokens
   └─► @repo/auth validates user
   └─► Session created
   └─► Session stored in DB (@repo/database)
   └─► Session cookie set (HttpOnly)

4. Callback redirects to auth-check
   └─► /auth/auth-check

5. Auth-check validates *presence of session*
   └─► Reads `login_origin` cookie
   └─► Clears `login_origin`
   └─► Redirects user to original app URL

6. Subsequent requests authenticated
   └─► Session cookie sent automatically
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

## SSE Channels

| Channel | Purpose | Subscribers |
|---------|---------|-------------|
| `tasks` | Task updates | Users viewing task board |
| `admin` | Admin updates | Users in admin panel |
| `public` | Public board updates | Anonymous viewers |

### Message Types

```typescript
type ServerEventBaseMessage =
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

```dotenv
VITE_URL_ROOT=http://admin.app.localhost:3000
VITE_ROOT_DOMAIN=app.localhost
VITE_PROJECT_NAME=Sayr
```

### Backend (apps/backend)

```dotenv
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
- **SSE support** - Built-in, performant SSE

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
