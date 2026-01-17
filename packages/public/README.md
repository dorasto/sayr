
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

## Install

```bash
npm install @sayrio/public
```

or

```bash
pnpm add @sayrio/public
```

---

## Usage

### Basic (REST)

```ts
import Sayr from "@sayrio/public";

const org = await Sayr.org.get("test");

console.log(org.name);
```

---

### Tasks

```ts
const { data: tasks, pagination } =
  await Sayr.org.tasks("test", {
    order: "desc",
    limit: 10
  });

console.log(tasks);
```

---

### Task Comments

```ts
const { data: comments } =
  await Sayr.org.comments("test", 12);

console.log(comments);
```

---

## WebSocket (Real‑Time Updates)

```ts
Sayr.ws(org.wsUrl, {
  [Sayr.wsTypes.UPDATE_ORG]: (data) => {
    console.log("Org updated", data);
  },

  [Sayr.wsTypes.UPDATE_TASK]: (task) => {
    console.log("Task updated", task);
  }
});
```

### Features
- Automatic reconnect
- Heartbeat (PING / PONG)
- Typed event names
- Public‑safe payloads

---

## React Hooks

React hooks are available via a sub‑path export:

```ts
import { useOrg, useTasks } from "@sayrio/public/react";
```

---

### `useOrg`

```tsx
const { data: org, loading } = useOrg("test");
```

---

### `useTasks`

```tsx
const { tasks } = useTasks("test", org?.wsUrl);
```

---

### `useComments`

```tsx
const { comments } = useComments(
  "test",
  task.shortId,
  org?.wsUrl
);
```

Hooks automatically refresh when relevant WebSocket events occur.

---

## Browser Usage (No Bundler)

You can use the SDK directly in the browser via ESM:

```html
<script type="module">
  import Sayr from "https://esm.sh/@sayrio/public";

  const org = await Sayr.org.get("test");
  console.log(org);
</script>
```

---

## API

### `Sayr.org`

| Method | Description |
|------|-------------|
| `get(slug)` | Get public organization |
| `labels(slug)` | List labels |
| `categories(slug, order?)` | List categories |
| `tasks(slug, opts?)` | List tasks (paginated) |
| `task(slug, shortId)` | Get single task |
| `comments(slug, shortId, opts?)` | List comments |

---

### `Sayr.ws(url, handlers)`

Create a WebSocket connection for public events.

```ts
const conn = Sayr.ws(wsUrl, {
  UPDATE_TASK: () => {}
});

// later
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

This package ships with full TypeScript definitions.

```ts
import type { Organization, Task } from "@sayrio/public";
```

---

## Notes

- All data is **public**
- No authentication required
- WebSocket connections are **not guaranteed** to be permanent
- Always handle reconnects (handled automatically)

---

## License

MIT © Sayr.io

---

If you want next, I can:
- Add **example apps** (React / Astro)
- Add **UMD browser build**
- Add **API reference site**
- Add **CI publish workflow**

This README now matches your **actual published package name** ✅


---
