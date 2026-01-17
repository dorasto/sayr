
# @sayrio/public

Public JavaScript & TypeScript SDK for **Sayr.io**.  
Provides **read‑only access** to Sayr organizations, tasks, comments, and
real‑time updates via WebSockets.

- ✅ REST + WebSocket
- ✅ Browser‑safe
- ✅ TypeScript first
- ✅ React hooks included (`/react`)
- ✅ Zero runtime dependencies

---

## Installation

Install the public Sayr SDK using your preferred package manager:

```bash
npm install @sayrio/public
```
or
```bash
pnpm add @sayrio/public
```

## Usage

### Basic Usage (REST)

Fetch public organization data using the REST API:

```ts
import Sayr from "@sayrio/public";

const org = await Sayr.org.get("acme");

console.log(org.name);
```

---

### Listing Tasks

Retrieve tasks for an organization with pagination and ordering support:

```ts
const { data: tasks, pagination } =
  await Sayr.org.tasks("acme", {
    order: "desc",
    limit: 10
  });

console.log(tasks);
```

---

### Task Comments

Fetch comments for a specific task:

```ts
const { data: comments } =
  await Sayr.org.comments("acme", 12);

console.log(comments);
```

---

### Real-Time Updates (WebSocket)

Subscribe to public real-time events using WebSockets:

```ts
Sayr.ws(org.wsUrl, {
  [Sayr.wsTypes.UPDATE_ORG]: (data) => {
    console.log("Organization updated", data);
  },

  [Sayr.wsTypes.UPDATE_TASK]: (task) => {
    console.log("Task updated", task);
  }
});
```

### WebSocket Features
- Automatic reconnection
- Heartbeat support (PING / PONG)
- Typed event constants
- Public-safe payloads only

---

## React Hooks

React hooks are available via a dedicated sub-path export:

```ts
import { useOrg, useTasks, useComments } from "@sayrio/public/react";
```

---

### `useOrg`

Fetch and subscribe to an organization:

```tsx
const { data: org, loading } = useOrg("acme");
```

---

### `useTasks`

Fetch and subscribe to tasks for an organization:

```tsx
const { tasks } = useTasks("acme", org?.wsUrl);
```

---

### `useComments`

Fetch and subscribe to comments for a task:

```tsx
const { comments } = useComments(
  "acme",
  task.shortId,
  org?.wsUrl
);
```

Hooks automatically refresh when relevant WebSocket events occur.

---

## Browser Usage (No Bundler)

The SDK can be used directly in the browser via ESM:

```html
<script type="module">
  import Sayr from "https://esm.sh/@sayrio/public";

  const org = await Sayr.org.get("acme");
  console.log(org);
</script>
```

---

## API

### `Sayr.org`

| Method                           | Description                 |
| -------------------------------- | --------------------------- |
| `get(slug)`                      | Fetch a public organization |
| `labels(slug)`                   | List organization labels    |
| `categories(slug, order?)`       | List categories             |
| `tasks(slug, opts?)`             | List tasks (paginated)      |
| `task(slug, shortId)`            | Fetch a single task         |
| `comments(slug, shortId, opts?)` | List task comments          |


---

### `Sayr.ws(url, handlers)`

Create a WebSocket connection for public events:

```ts
const conn = Sayr.ws(wsUrl, {
  UPDATE_TASK: () => {}
});

// Close the connection when no longer needed
conn.close();
```

---

### `Sayr.wsTypes`

```ts
Sayr.wsTypes.UPDATE_TASK
Sayr.wsTypes.UPDATE_ORG
Sayr.wsTypes.ERROR
// ...
```

---

## TypeScript

This package ships with full TypeScript definitions:

```ts
import type { Organization, Task } from "@sayrio/public";
```
