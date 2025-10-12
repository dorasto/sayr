# AGENTS.md - Project Management Tool

## Overview
This is a Turborepo monorepo for a project management application with a Next.js frontend, Hono backend, and shared packages for auth, database, storage, UI, and utilities. Uses pnpm for package management, Biome for linting/formatting, and TypeScript throughout.

## Commands
- Build: `turbo build`
- Lint: `biome check .`
- Format: `biome format --write .`
- Check types: `turbo check-types`
- Run tests: Not configured; use Jest/Vitest if added (e.g., `pnpm test` for single test with `--testPathPattern=`)

## Apps

### Backend (apps/backend)
- **Runtime**: Bun for development, Hono framework for API routes.
- **Architecture**: REST API with WebSocket support, CORS configured for frontend origins, request ID middleware, auth integration via @repo/auth.
- **Key Features**: Organization and role-based access control functions (getOrganization, checkMembershipRole), error handling with logging, static file serving.
- **Dependencies**: @repo/auth, @repo/database, @repo/storage, @repo/util, Drizzle ORM, Hono.

### Web (apps/web)
- **Framework**: Next.js 15 with Turbopack, React 19, Tailwind CSS.
- **Architecture**: App Router, RSC/TSX, Shadcn/ui components, TanStack Query for data fetching, theme provider for dark mode.
- **Key Features**: Image optimization with remote patterns from CDN, transpile workspace packages, metadata and viewport configuration.
- **Dependencies**: @repo/auth, @repo/database, @repo/ui, @repo/util, Next.js, React, TanStack tools.

## Packages

### Auth (@repo/auth)
- **Library**: Better Auth with Drizzle adapter for PostgreSQL.
- **Features**: OAuth integration (Doras provider), admin plugin, user roles, session management.
- **Exports**: Auth client and configuration.

### Database (@repo/database)
- **ORM**: Drizzle with PostgreSQL.
- **Schema**: Tables for auth (users, sessions), organizations, projects, tasks, labels, members, comments, timeline.
- **Types**: Inferred TypeScript types for all entities, extended types like OrganizationWithMembers, TaskWithLabels.
- **Functions**: CRUD operations for labels, organizations, projects, tasks.

### Storage (@repo/storage)
- **Service**: MinIO client for object storage (Hetzner).
- **Features**: Upload with obfuscated filenames (SHA-256 hash), list objects with metadata, remove single/multiple objects, enriched metadata with user info.
- **Security**: Salted hashes for unpredictable filenames, metadata for original names.

### UI (@repo/ui)
- **Library**: Shadcn/ui components with Tailwind CSS, Lucide icons.
- **Architecture**: React components for forms, dialogs, tables, etc., custom components for tasks (columns, filters, pagination).
- **Features**: Responsive design, headless toast, image crop, custom sidebars, hooks for state management and file uploads.
- **Aliases**: @repo/ui for components, utils, hooks.

### Util (@repo/util)
- **Utilities**: Helper functions for file names, CDN URLs, color opacity, date formatting (relative and compact), slug generation, channel parsing.
- **Purpose**: Shared logic for frontend/backend, e.g., formatDateTimeFromNow for "X minutes ago".

### TypeScript Config (@repo/typescript-config)
- **Base Config**: Strict TypeScript settings, shared across packages.

## Code Style Guidelines
- **Formatting**: Use Biome (tabs, indent width 3, line width 120, CRLF endings).
- **Imports**: Absolute imports for workspace packages (@repo/*), relative for local files.
- **Types**: Strict TypeScript; use explicit types, avoid `any` (warned), prefer interfaces for objects.
- **Naming**: camelCase for variables/functions, PascalCase for components/types/interfaces.
- **Error Handling**: Use try-catch blocks; in React, implement error boundaries for component errors.
- **Other**: Double quotes, semicolons always, trailing commas ES5, arrow parentheses always.

## TanStack Query Usage
- Used for client-side data fetching with QueryClient per request (SSR compatible), devtools enabled.
- Recommendations: Add versioned query keys for cache invalidation, use optimistic updates for UX, implement error boundaries for failed queries, prefetch data on hover for performance.

## Project Idea
- Collaborative project management tool for teams: multi-tenant organizations, projects with assignable tasks (labeled, commented, timeline history), real-time WebSocket updates, file uploads to MinIO, OAuth auth.
- Goal: Streamline task tracking, team collaboration, and progress visualization.

## Database Optimization
- Add indexes on frequently queried fields (e.g., organizationId, projectId in tasks); use pagination for large lists; consider read replicas for heavy reads.

## Security
- Implement rate limiting in Hono, validate all inputs with Zod, use prepared statements to prevent SQL injection, avoid exposing sensitive data in errors.

## Performance
- In Next.js, use ISR for static pages, lazy load components, optimize images with Next.js Image; in queries, select only needed columns.

## Testing
- Add Vitest for unit tests, Playwright for E2E; focus on auth flows, task CRUD, and WebSocket events.

## Deployment
- Use Docker for consistency; set up CI/CD with GitHub Actions for build/test/deploy; monitor with Sentry for errors.

## Agent Behavior
- Always ask before committing; use Task tool for multi-step tasks like refactoring; prefer specific tools (e.g., Grep for patterns, Read for files).