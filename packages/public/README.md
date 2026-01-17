
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

## Basic HTML Example

This example shows how to use `@sayrio/public` in a **plain HTML file** with no
build tools.

> **Important:**  
> This SDK is published as an **ES module**, so you must use
> `type="module"` and `import`.  
> It does **not** create a global `Sayr` variable.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Sayr Public SDK – HTML Example</title>
    <style>
      body {
        background: #0b0b0b;
        color: #e5e7eb;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        padding: 24px;
      }
    </style>
  </head>

  <body>
    <h1>Sayr Public SDK</h1>
    <pre id="out">Loading…</pre>

    <script type="module">
      import Sayr from "https://esm.sh/@sayrio/public";

      const out = document.getElementById("out");

      function log(label, value) {
        out.textContent +=
          label + ": " + JSON.stringify(value, null, 2) + "\n\n";
      }

      const slug = "org";

      // Fetch public organization
      const org = await Sayr.org.get(slug);
      log("Organization", org);

      // Connect to public WebSocket
      Sayr.ws(org.wsUrl, {
        [Sayr.wsTypes.UPDATE_ORG]: (data) => {
          log("Org updated", data);
        },

        [Sayr.wsTypes.UPDATE_TASK]: (task) => {
          log("Task updated", task);
        },

        [Sayr.wsTypes.ERROR]: (err) => {
          log("WebSocket error", err);
        }
      });
    </script>
  </body>
</html>
```

---

## Notes on Browser Usage

- This package **does not expose a global `Sayr`**
- Always use `type="module"` and `import`
- For legacy `<script>` usage, a UMD build is not currently provided
- `esm.sh` is recommended for CDN usage

---