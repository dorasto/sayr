# @sayrio/public/react

React bindings for the **Sayr Public SDK**.

These hooks provide a thin, idiomatic React layer on top of
`@sayrio/public`, handling:

- loading & error state
- automatic cleanup
- real‑time updates via WebSockets

> The core SDK is framework‑agnostic.  
> These hooks are **optional helpers** for React applications.

---

## Installation

Install the core SDK (React hooks are included):

```bash
npm install @sayrio/public
```

or

```bash
pnpm add @sayrio/public
```

---

## Usage

```ts
import {
  useOrg,
  useTasks,
  useComments
} from "@sayrio/public/react";
```

All hooks are **read‑only** and safe to use in the browser.

---

## Hooks

### `useOrg(slug)`

Fetches and subscribes to a public organization.

```tsx
import { useOrg } from "@sayrio/public/react";

function OrgHeader() {
  const { data: org, loading, error } = useOrg("acme");

  if (loading) return <span>Loading…</span>;
  if (error) return <span>Error loading org</span>;

  return <h1>{org.name}</h1>;
}
```

#### Returns

```ts
{
  data: Organization | null;
  loading: boolean;
  error: ApiError | null;
}
```

---

### `useTasks(slug, wsUrl?)`

Fetches and subscribes to tasks for an organization.

If a WebSocket URL is provided, the hook will automatically
refresh when relevant events occur.

```tsx
import { useTasks } from "@sayrio/public/react";

function TaskList({ slug, wsUrl }) {
  const { data: tasks, loading } = useTasks(slug, wsUrl);

  if (loading) return <span>Loading…</span>;

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

#### Returns

```ts
{
  data: Task[];
  loading: boolean;
  error: ApiError | null;
}
```

---

### `useComments(slug, shortId, wsUrl?)`

Fetches and subscribes to comments for a specific task.

```tsx
import { useComments } from "@sayrio/public/react";

function Comments({ slug, task, wsUrl }) {
  const { data: comments, loading } = useComments(
    slug,
    task.shortId,
    wsUrl
  );

  if (loading) return <span>Loading…</span>;

  return (
    <ul>
      {comments.map((c) => (
        <li key={c.id}>{c.contentMarkdown}</li>
      ))}
    </ul>
  );
}
```

#### Returns

```ts
{
  data: Comment[];
  loading: boolean;
  error: ApiError | null;
}
```

---

## Real‑Time Updates

When a `wsUrl` is provided:

- hooks automatically open a WebSocket connection
- relevant events trigger a refresh
- connections are cleaned up on unmount

You do **not** need to manually manage WebSockets.

---

## Error Handling

All hooks return typed `ApiError` objects:

```tsx
if (error?.status === 404) {
  return <NotFound />;
}
```

---

## TypeScript

All hooks are fully typed and re‑export core SDK types:

```ts
import type {
  Organization,
  Task,
  Comment
} from "@sayrio/public";
```

---

## Notes

- Hooks are **read‑only**
- No authentication is required
- Hooks are browser‑only (not SSR safe by default)
- For advanced caching or SSR, use the core SDK directly

---

## When *not* to use these hooks

- You need SSR / SSG
- You use TanStack Query or SWR
- You want full cache control

In those cases, use the core SDK:

```ts
import Sayr from "@sayrio/public";
```

---
