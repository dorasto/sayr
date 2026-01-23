# @sayrio/public

Public JavaScript & TypeScript SDK for **Sayr.io**.  
Provides **read‑only access** to Sayr organizations, tasks, comments, and
real‑time updates via WebSockets.

- ✅ REST + WebSocket
- ✅ Browser‑safe
- ✅ TypeScript‑first
- ✅ Zero runtime dependencies
- ✅ Versioned API (`v1`)
- ✅ Consistent `ApiResult<T>` responses

> React hooks are available via the **`@sayrio/public/react`** sub‑path export.

---

## Installation

```bash
npm install @sayrio/public
```

or

```bash
pnpm add @sayrio/public
```

---

## Core Concepts

### ✅ `ApiResult<T>`

All SDK methods return a **non‑throwing** result object:

```ts
interface ApiResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
```

Always check `success` before accessing `data`.

---

## Usage

### Basic Usage (REST)

Fetch a public organization.

`Sayr.org` is an alias for the latest API version (`v1`).

```ts
import Sayr from "@sayrio/public";

const res = await Sayr.org.get("acme");

if (!res.success) {
  console.error(res.error);
  return;
}

console.log(res.data.name);
```

You can also use the versioned API explicitly:

```ts
const res = await Sayr.v1.org.get("acme");
```

---

## Organizations

### Fetch an Organization

```ts
const res = await Sayr.org.get("acme");

if (res.success) {
  console.log(res.data);
}
```

---

## Tasks

### List Tasks (Paginated)

```ts
const res = await Sayr.org.tasks.list("acme", {
  order: "desc",
  limit: 10,
});

if (!res.success) return;

res.data.items.forEach((task) => {
  console.log(task.title);
});

console.log(res.data.pagination);
```

Returned shape:

```ts
ApiResult<{
  items: Task[];
  pagination: Pagination;
}>
```

---

### Fetch a Single Task

```ts
const res = await Sayr.org.tasks.get("acme", 42);

if (res.success) {
  console.log(res.data.title);
}
```

---

## Comments

### List Task Comments (Paginated)

```ts
const res = await Sayr.org.comments.list("acme", 42);

if (!res.success) return;

res.data.items.forEach((comment) => {
  console.log(comment.contentMarkdown);
});
```

Returned shape:

```ts
ApiResult<{
  items: Comment[];
  pagination: Pagination;
}>
```

---

## Labels & Categories

### Labels

```ts
const res = await Sayr.org.labels.list("acme");

if (res.success) {
  console.log(res.data);
}
```

### Categories

```ts
const res = await Sayr.org.categories.list("acme", "desc");

if (res.success) {
  console.log(res.data);
}
```

---

## Authenticated User (`/me`)

The `/me` namespace provides **read‑only access** to the currently
authenticated user.

> Authentication is required  
> Set a token using `Sayr.client.setToken(...)`.

---

### Set Token

```ts
Sayr.client.setToken("********");
```

---

### Fetch Current User

```ts
const res = await Sayr.me.get();

if (res.success) {
  console.log(res.data.email);
}
```

---

### List Your Organizations

```ts
const res = await Sayr.me.organizations();

if (res.success) {
  console.log(res.data);
}
```

---

## Real‑Time Updates (WebSocket)

Subscribe to public real‑time events using WebSockets:

```ts
Sayr.ws(org.wsUrl, {
  [Sayr.WS_EVENTS.UPDATE_TASK]: (data) => {
    console.log("Task updated", data);
  },
});
```

### WebSocket Features

- Automatic reconnection
- Heartbeat support (PING / PONG)
- Typed event constants
- Public‑safe payloads only

---

## Browser Usage (No Bundler)

```html
<script type="module">
  import Sayr from "https://esm.sh/@sayrio/public";

  const res = await Sayr.org.get("acme");

  if (res.success) {
    console.log(res.data);
  }
</script>
```

---

## API Overview

### `Sayr.org` (latest)

Alias for `Sayr.v1.org`.

#### Organization

| Method      | Description                 |
| ----------- | --------------------------- |
| `get(slug)` | Fetch a public organization |

---

#### Tasks

| Method                     | Description            |
| -------------------------- | ---------------------- |
| `tasks.list(slug, opts?)`  | List tasks (paginated) |
| `tasks.get(slug, shortId)` | Fetch a single task    |

---

#### Comments

| Method                                | Description              |
| ------------------------------------- | ------------------------ |
| `comments.list(slug, shortId, opts?)` | List task comments       |

---

#### Labels

| Method              | Description              |
| ------------------- | ------------------------ |
| `labels.list(slug)` | List organization labels |

---

#### Categories

| Method                          | Description     |
| ------------------------------- | --------------- |
| `categories.list(slug, order?)` | List categories |

---

### `Sayr.me`

Authenticated user endpoints.

| Method            | Description                            |
| ----------------- | -------------------------------------- |
| `get()`           | Fetch the authenticated user           |
| `organizations()` | List organizations the user belongs to |

---

### `Sayr.ws(url, handlers)`

Create a WebSocket connection for public events:

```ts
const conn = Sayr.ws(wsUrl, {
  UPDATE_TASK: () => {},
});

conn.close();
```

---

### `WS_EVENTS`

Typed WebSocket event constants:

```ts
Sayr.WS_EVENTS.CREATE_TASK;
Sayr.WS_EVENTS.UPDATE_TASK;
Sayr.WS_EVENTS.UPDATE_TASK_COMMENTS;
Sayr.WS_EVENTS.ERROR;
```

---

## TypeScript

This package ships with full TypeScript definitions:

```ts
import type {
  Organization,
  Task,
  Comment,
  Label,
  Category,
} from "@sayrio/public";
```

---

## React Hooks

React bindings are available via:

```ts
import {
  useOrg,
  useTasks,
  useTask,
  useComments,
} from "@sayrio/public/react";
```

See **`@sayrio/public/react` README** for full hook documentation.

---