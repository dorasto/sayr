# Sayr.io

**Project management your users can see.**

Sayr is a source-available project management platform with a built-in public-facing portal. Your team works internally while users submit feedback, vote on features, and track progress — all from the same tool.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-red)](https://tanstack.com/start)
[![React](https://img.shields.io/badge/React-19.2+-blue?logo=react)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-4.10+-orange)](https://hono.dev/)
[![Bun](https://img.shields.io/badge/Bun-runtime-pink?logo=bun)](https://bun.sh/)

---

## The Problem

Teams juggle a project management tool and a separate customer feedback tool — duplicated work, stale updates, and users who never know what's happening.

Sayr replaces both with one board, two views: your team sees everything, the public sees only what you allow.

---

## Features

### Task Management
- Tasks with statuses: Backlog, Todo, In Progress, Done, Canceled
- 5 priority levels: Urgent, High, Medium, Low, None
- Multiple assignees per task
- **Subtasks** — one level deep
- **Task relations** — Blocks, Depends on, Related to
- **Labels** — color-coded, multiple per task, with own visibility settings
- **Categories** — group tasks and route to GitHub repositories
- **Releases** — milestones/versions with progress charts, assignee workload, and priority distribution
- **Saved views** — filtered/grouped views persisted per organization
- **Issue templates** — pre-fill title, description, labels, assignees, category, priority, status, release, and visibility
- Kanban and list views
- Bulk operations (status changes, label assignment)
- Full audit timeline — every change recorded

### Visibility System
The core differentiator. Every item carries its own public/private toggle: tasks, comments (public vs. internal), labels, and timeline entries. Changes take effect immediately.

### Public Portal
- Each organization gets a dedicated subdomain (`{org}.sayr.io` on cloud, or your own domain when self-hosting)
- Live task board showing public tasks with sorting (Most Popular, Newest, Trending)
- User voting on tasks (real-time counts)
- Public task submission by signed-in visitors, optionally from a template
- Public comments with reactions; member badge distinguishes official responses
- Real-time updates via WebSocket
- Organization branding (banner, logo, name, description)

### GitHub Integration
- Connect one or more GitHub organizations via GitHub App
- Bidirectional task ↔ issue sync, per repository, optionally scoped by category
- Keyword references in commits and PRs: `Ref #N`, `Fixes #N`, `Closes #N`, `Resolves #N`
- Commit and PR lifecycle tracking appear on the task timeline
- Comment syncing from GitHub to Sayr
- Respects repository visibility (private repo activity stays internal)

### Collaboration & Real-Time
- Rich text editor (ProseKit) with headings, lists, code blocks, images, and @mentions
- Threaded comments with edit history and emoji reactions
- WebSocket broadcasting for all create/update/delete events
- Notifications and inbox
- My Tasks — cross-organization view of all assigned work

### Account & Security
- GitHub OAuth login
- Email + password authentication
- **Two-factor authentication** (TOTP + backup codes)
- **Passkeys** — Face ID, Touch ID, Windows Hello, hardware security keys (WebAuthn)
- Active session management — view and revoke individual sessions

### Organization Management
- Members and teams with granular per-permission controls
- Permission categories: Organization, Content Settings, Tasks, Moderation
- "Most permissive wins" model across team memberships
- Blocked users list

### API
- REST API with OpenAPI spec (served via Scalar)
- Bearer token authentication
- Rate limiting: 100 req/min authenticated, 10 req/min unauthenticated

---

## Editions

Sayr ships in three editions. Docker images are edition-locked at build time.

| | Community | Cloud | Enterprise |
|---|---|---|---|
| **For** | Free self-hosting | Hosted sayr.io | Licensed self-hosting |
| **Organizations** | 1 | Unlimited | Unlimited |
| **Members** | Unlimited | Free: 5 / Pro: unlimited | Unlimited |
| **Releases** | Unlimited | Free: 0 / Pro: unlimited | Unlimited |
| **Saved views** | Unlimited | Free: 3 / Pro: unlimited | Unlimited |
| **Issue templates** | Unlimited | Free: 3 / Pro: unlimited | Unlimited |
| **Teams** | Unlimited | Free: 1 / Pro: unlimited | Unlimited |
| **Availability** | Now | Now | Coming soon |

Community Edition images are published at `ghcr.io/dorasto/sayr-ce-*`.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| [TanStack Start](https://tanstack.com/start) | Full-stack React framework (SSR + server functions) |
| [React](https://react.dev/) | UI library |
| [TanStack Router](https://tanstack.com/router) | Type-safe file-based routing |
| [TanStack Query](https://tanstack.com/query) | Server state management |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS |
| [Shadcn/ui](https://ui.shadcn.com/) | Accessible component library (Radix primitives) |
| [ProseKit](https://prosekit.dev/) | Block-based rich text editor (ProseMirror) |
| [Vite](https://vite.dev/) | Build tool |

### Backend
| Technology | Purpose |
|------------|---------|
| [Bun](https://bun.sh/) | JavaScript runtime |
| [Hono](https://hono.dev/) | Lightweight web framework (REST + WebSocket) |
| [Drizzle ORM](https://orm.drizzle.team/) | TypeScript ORM |
| [PostgreSQL](https://www.postgresql.org/) | Primary database |
| [Redis](https://redis.io/) | Job queue and caching |
| [MinIO](https://min.io/) | S3-compatible object storage |
| [Zod](https://zod.dev/) | Validation |

### Infrastructure & Tooling
| Technology | Purpose |
|------------|---------|
| [Turborepo](https://turbo.build/repo) | Monorepo build orchestration |
| [pnpm](https://pnpm.io/) | Package manager |
| [Biome](https://biomejs.dev/) | Linting and formatting |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript throughout |
| [Docker](https://www.docker.com/) | Containerization |
| [Nginx](https://nginx.org/) | Reverse proxy and subdomain routing |

---

## Project Structure

```
sayr/
├── apps/
│   ├── backend/          # Hono API server (Bun runtime, port 5468)
│   ├── marketing/        # Astro marketing site + Starlight docs (port 3001)
│   ├── nginx/            # Nginx reverse-proxy config
│   ├── start/            # TanStack Start frontend (port 3000)
│   ├── traefik/          # Traefik TLS termination config
│   └── worker/           # Background job processor (GitHub webhooks, cron)
└── packages/
    ├── auth/             # Better Auth configuration
    ├── database/         # Drizzle ORM schemas and CRUD functions
    ├── edition/          # Edition detection, capabilities, and plan limits
    ├── opentelemetry/    # Tracing and observability utilities
    ├── queue/            # Job queue abstraction (Redis or file-based)
    ├── storage/          # MinIO/S3 client with obfuscated filenames
    ├── ui/               # Shared Shadcn/ui component library
    ├── util/             # Shared utilities (slugs, date formatting, CDN URLs)
    └── typescript-config/# Shared TypeScript configurations
```

---

## Getting Started

### Prerequisites

- **Bun** 1.2+
- **Node.js** 22+ (LTS)
- **pnpm** 10.6+ (`npm install -g pnpm`)
- **PostgreSQL** 15+
- **Redis** (required for the job queue in production)
- **Docker** (optional, for containerized development)

### Available Commands

#### Root

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Run Biome linting |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format-write` | Format code with Biome |
| `pnpm check-types` | TypeScript type checking |

#### Per App/Package

| Command | Description |
|---------|-------------|
| `pnpm -F backend dev` | Backend only |
| `pnpm -F start dev` | Frontend only |
| `pnpm -F marketing dev` | Marketing site only |
| `pnpm -F worker dev` | Worker only |
| `pnpm -F @repo/database generate` | Generate database schema |
| `pnpm -F @repo/database migrate` | Apply schema migrations |
| `pnpm -F @repo/database db:studio` | Open Drizzle Studio |
| `pnpm -F start test` | Run tests (Vitest) |

---

## Integrations

Sayr supports extensible integrations that can add custom API routes and UI pages.

### Creating an Integration

Use the create-integration scaffolding tool:

```bash
pnpm create-integration <integration-name> -a <author-name> -d <integration-description>
```

This generates a new integration in `packages/integrations/` with:

- **API Routes** — Custom REST endpoints (`/api/integrations/:orgId/:integrationId/...`)
- **UI Pages** — Admin pages rendered from config (cards, lists, tabs, grids)
- **Settings** — Per-organization configuration

### Integration Structure

```
my-integration/
├── api/
│   └── index.ts       # API route handlers
├── src/
│   └── index.ts       # Business logic, commands, utilities
├── ui/
│   ├── pages.ts       # UI page config (settings, items, sync, etc.)
│   ├── renderer.tsx    # Reusable UI components
│   └── components/    # Custom React components
├── integration.ts     # Manifest registration
├── docs.ts            # Documentation
└── README.md          # Integration-specific docs
```

### UI Page Configuration

Pages are defined with a declarative config:

```typescript
const settingsPage: UIPage = {
  title: "Settings",
  layout: "admin",
  api: {
    path: "/settings",
    methods: { get: {}, patch: {} },
  },
  sections: [
    {
      type: "card",
      title: "Configuration",
      fields: [
        { name: "apiKey", type: "string", label: "API Key", required: true },
        { name: "enabled", type: "boolean", label: "Enabled" },
      ],
      actions: [{ type: "save", label: "Save" }],
    },
  ],
};
```

### Available Section Types

| Type | Description |
|------|-------------|
| `card` | Card with fields and optional actions |
| `list` | Table or card list with CRUD actions |
| `tabs` | Tabbed sections |
| `grid` | Multi-column grid layout |

### Field Types

- `string`, `number` — Text/number input
- `boolean` — Checkbox
- `select` — Dropdown with options
- `textarea` — Multi-line text
- `readonly` — Display-only field
- `heading`, `label` — Typography

### Data Binding

Use `bind` to extract nested data from API responses:

```typescript
{ name: "status", type: "readonly", bind: "$.preview.status" }
{ name: "data", type: "readonly", bind: "$.preview.stringify" }  // JSON stringify
```

### Enabling an Integration

```bash
export INTEGRATION_MYINTEGRATION_ENABLED=true
```

Then configure per-organization in the admin UI.

---

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes following the code style guidelines below
4. Push and open a Pull Request

### Code Style

- **Indentation**: Tabs, width 3
- **Line width**: 120 characters
- **Quotes**: Double quotes, semicolons always
- **Imports**: Use `@repo/*` for workspace packages, `@/` for local app imports
- **TypeScript**: Strict mode, avoid `any`, use `import type` for type-only imports
- **Naming**: camelCase for variables/functions, PascalCase for components/types

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `style:` — Formatting only
- `refactor:` — Code refactoring
- `test:` — Tests
- `chore:` — Maintenance

---

## Acknowledgments

- [Turborepo](https://turbo.build/repo) for monorepo tooling
- [Shadcn/ui](https://ui.shadcn.com/) for accessible components
- [Better Auth](https://www.better-auth.com/) for authentication
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database operations
- [Hono](https://hono.dev/) for the fast, lightweight web framework
- [TanStack](https://tanstack.com/) for the excellent full-stack toolkit

---

<p align="center">
  Made with care by <a href="https://doras.to">Doras Media Ltd</a>
</p>
