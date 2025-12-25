# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sayr.io is a transparent, collaborative project management platform built as a Turborepo monorepo. It bridges internal workflows with public collaboration through granular visibility controls (public/private per-item).

## Commands

```bash
# Development
pnpm dev              # Start all apps (backend :5468, web :3001)
pnpm dev:op           # Start with 1Password secret injection

# Build & Quality
pnpm build            # Build all apps
pnpm lint             # Biome linting
pnpm lint:fix         # Fix lint issues
pnpm format-write     # Format with Biome
pnpm check-types      # TypeScript type checking

# Database
pnpm -F @repo/database db:push    # Apply schema to PostgreSQL
pnpm -F @repo/database db:studio  # Open Drizzle Studio

# Per-app development
pnpm -F backend dev   # Backend only
pnpm -F web dev       # Frontend only
pnpm -F worker dev    # GitHub webhook processor only
```

## Architecture

```
apps/
  backend/     # Hono API server on Bun runtime (REST + WebSocket)
  web/         # Next.js 15 frontend with App Router
  worker/      # GitHub webhook queue processor
  start/       # Experimental TanStack Start frontend

packages/
  auth/        # Better Auth config (GitHub + Doras OAuth)
  database/    # Drizzle ORM schemas and CRUD functions
  storage/     # MinIO S3-compatible client with obfuscated filenames
  ui/          # Shadcn/ui component library
  util/        # Shared utilities (date formatting, slugs, CDN URLs)
  queue/       # Job queue abstraction (Redis or file-based)
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS 4, TanStack Query, BlockNote editor
- **Backend**: Bun runtime, Hono framework, Drizzle ORM, PostgreSQL
- **Auth**: Better Auth with session cookies
- **Storage**: MinIO with SHA-256 hashed filenames

## Code Style (Biome)

- Tabs, indent width 3, line width 120, CRLF endings
- Double quotes, semicolons always, trailing commas ES5
- Imports: `@repo/*` for workspace packages, relative for local files
- TypeScript strict mode; avoid `any` (warned)

## Key Patterns

**Subdomain Routing**: Next.js middleware rewrites `{org}.domain.com` to `/org/{slug}` paths.

**Visibility Controls**: Tasks, comments, and timeline entries have `visible: "public" | "private"` for granular privacy.

**Database Types**: Use Drizzle's `$inferSelect`/`$inferInsert`. Extended types like `TaskWithLabels`, `OrganizationWithMembers` include relations.

**Rich Text**: Task descriptions use BlockNote, stored as JSONB (`NodeJSON` type).

**Job Queue**: Set `QUEUE_MODE=redis` for Redis or omit for file-based (`.queues/` directory).

## Database Schema (packages/database)

Core tables: `user`, `session`, `organization`, `member`, `task`, `taskAssignee`, `taskComment`, `taskTimeline`, `label`, `category`, `githubRepository`, `githubIssue`.

Task statuses: `backlog`, `todo`, `in-progress`, `done`, `canceled`
Priority levels: `none`, `low`, `medium`, `high`, `urgent`

## Environment Variables

Critical variables (see ENVIRONMENT.md for 1Password setup):
- `DATABASE_URL` - PostgreSQL connection string
- `GITHUB_CLIENT_ID/SECRET` - OAuth
- `STORAGE_URL/ACCESS_KEY/SECRET_KEY` - MinIO
- `BETTER_AUTH_SECRET` - Session encryption
- `FILE_SALT`, `FILE_CDN` - File upload config
- `NEXT_PUBLIC_API_SERVER`, `NEXT_PUBLIC_WS_URL` - API endpoints

## Related Documentation

- `AGENTS.md` - Detailed architecture for AI agents
- `ENVIRONMENT.md` - Environment setup with 1Password integration
- `FILTER_SYSTEM.md` - Task filtering UI system documentation
