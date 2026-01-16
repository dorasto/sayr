---
title: WS Overview
description: Introduction to the Sayr ws API
---

# Sayr Public WebSocket API

This document explains how to **discover**, **connect to**, and **consume**
Sayr’s public WebSocket events for an organization.

All events described in this document are delivered with the **PUBLIC** scope.
All payloads are **public‑safe** and mirror stable backend types.

---

## Discovering the WebSocket URL

Clients must first fetch public organization metadata.  
The response includes the fully qualified WebSocket URL.

### Endpoint

```text
GET https://sayr.io/api/public/org/organization/{orgSlug}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "45205CEF-184A-4D32-BE02-81341B7C15F9",
    "name": "Acme Inc",
    "slug": "acme",
    "wsUrl": "wss://acme.sayr.io/ws?orgId=45205CEF-184A-4D32-BE02-81341B7C15F9"
  }
}
```

---

## Connecting to the WebSocket

```ts
const socket = new WebSocket(wsUrl);
```

---

## Message Envelope

All WebSocket messages share a consistent envelope.

```ts
export type WSScope = "PUBLIC";

export interface WSBaseMessage<T = unknown> {
  type: WSMessageType;
  scope: WSScope;
  data: T;
  meta?: {
    ts: number;
  };
}
```

---

## Supported Event Types

```ts
export type WSMessageType =
  | "CONNECTION_STATUS"
  | "SUBSCRIBED"
  | "ERROR"
  | "PING"
  | "PONG"
  | "UPDATE_ORG"
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "UPDATE_TASK_COMMENTS"
  | "UPDATE_TASK_VOTE"
  | "UPDATE_LABELS"
  | "UPDATE_VIEWS"
  | "UPDATE_CATEGORIES"
  | "UPDATE_ISSUE_TEMPLATES"
  | "DISCONNECTED";
```

---

## Connection Lifecycle Events

### CONNECTION_STATUS

Sent immediately after a successful WebSocket connection.

```ts
export interface ConnectionStatusPayload {
  status: "connected" | "disconnected";
  authenticated: boolean;
  wsClientId: string;
}

export type ConnectionStatusMessage =
  WSBaseMessage<ConnectionStatusPayload>;
```

#### Example

```json
{
  "type": "CONNECTION_STATUS",
  "scope": "PUBLIC",
  "data": {
    "status": "connected",
    "authenticated": false,
    "wsClientId": "fb45fb76-083c-4550-96f3-d5e9353e01ff"
  },
  "meta": { "ts": 1768541678686 }
}
```

---

### SUBSCRIBED

Sent once the client is subscribed to the public organization channel.

```ts
export interface SubscribedPayload {
  orgId: string;
  channel: "public";
}

export type SubscribedMessage = WSBaseMessage<SubscribedPayload>;
```

---

## Error Events

### ERROR

Sent when the server encounters an error related to the connection or a
client action.

```ts
export interface WSErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
}

export type WSErrorMessage = WSBaseMessage<WSErrorPayload>;
```

#### Example

```json
{
  "type": "ERROR",
  "scope": "PUBLIC",
  "data": {
    "code": "ORG_NOT_FOUND",
    "message": "Organization does not exist",
    "retryable": false
  },
  "meta": { "ts": 1768541679000 }
}
```

#### Common Error Codes

| Code | Description | Retry |
|-----|-------------|-------|
| `ORG_NOT_FOUND` | Invalid organization | No |
| `RATE_LIMITED` | Too many connections | Yes |
| `INTERNAL_ERROR` | Server error | Yes |
| `UNAUTHORIZED` | Auth required | No |

---

## Heartbeat (PING / PONG)

The server periodically sends `PING` messages.

### Server → Client

```json
{
  "type": "PING",
  "scope": "PUBLIC",
  "meta": { "ts": 1768541679000 }
}
```

### Client → Server

```json
{
  "type": "PONG"
}
```

> If the client does not respond in time, the server may close the connection.

---

## Reconnection Guidance

Clients should assume WebSocket connections are **not permanent**.

**Recommended strategy**
- Reconnect automatically on abnormal close
- Use exponential backoff with jitter
- Cap backoff at 30 seconds
- Re‑fetch the `wsUrl` before reconnecting

```ts
let retry = 0;

function connect(wsUrl: string) {
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    retry = 0;
  };

  socket.onclose = () => {
    const delay = Math.min(1000 * 2 ** retry, 30000);
    retry += 1;
    setTimeout(() => connect(wsUrl), delay);
  };

  socket.onerror = () => {
    socket.close();
  };

  return socket;
}
```

---

## Core Domain Types

### Organization

```ts
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  bannerImg: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  privateId: null;
}
```

---

### Public User

```ts
export interface PublicUser {
  id: string;
  name: string;
  image: string | null;
}
```

---

### Label

```ts
export interface Label {
  id: string;
  organizationId: string;
  name: string;
  color: string | null;
  createdAt: string | null;
}
```

---

### Task

```ts
export type TaskVisibility = "public";

export type TaskStatus =
  | "open"
  | "planned"
  | "in-progress"
  | "completed"
  | "closed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  organizationId: string;
  shortId: number;
  visible: TaskVisibility;
  title: string;
  description: unknown | null; // ProseMirror JSON
  status: TaskStatus;
  priority: TaskPriority;
  category: string | null;
  voteCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: PublicUser | null;
  assignees: PublicUser[];
  labels: Label[];
  githubIssue: unknown | null;
}
```

---

### Task Comment (Reference)

Comments are not pushed inline. This shape is provided for reference only.

```ts
export interface TaskComment {
  id: string;
  organizationId: string;
  taskId: string | null;
  content: unknown | null; // ProseMirror JSON
  visibility: "public" | "internal";
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
```

---

### View / Category / Issue Template

```ts
export interface View {
  id: string;
  name: string;
  createdAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string | null;
}

export interface IssueTemplate {
  id: string;
  name: string;
  createdAt: string | null;
}
```

---

## Event Payload Types

```ts
export type UpdateOrgMessage = WSBaseMessage<Organization>;
export type CreateTaskMessage = WSBaseMessage<Task>;
export type UpdateTaskMessage = WSBaseMessage<Task>;

export interface UpdateTaskCommentsPayload {
  id: string; // taskId
}
export type UpdateTaskCommentsMessage =
  WSBaseMessage<UpdateTaskCommentsPayload>;

export interface UpdateTaskVotePayload {
  id: string;
  voteCount: number;
}
export type UpdateTaskVoteMessage =
  WSBaseMessage<UpdateTaskVotePayload>;

export type UpdateLabelsMessage = WSBaseMessage<Label[]>;
export type UpdateViewsMessage = WSBaseMessage<View[]>;
export type UpdateCategoriesMessage = WSBaseMessage<Category[]>;
export type UpdateIssueTemplatesMessage =
  WSBaseMessage<IssueTemplate[]>;
```

---

## Typed TypeScript Client

A minimal, fully typed public client with heartbeat and reconnection support.

```ts
type EventHandler<T> = (payload: T) => void;

export class SayrPublicWSClient {
  private socket?: WebSocket;
  private handlers = new Map<WSMessageType, EventHandler<any>[]>();
  private retry = 0;

  constructor(private wsUrl: string) {}

  connect() {
    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      this.retry = 0;
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as WSBaseMessage;

      if (message.type === "PING") {
        this.send({ type: "PONG" });
        return;
      }

      const handlers = this.handlers.get(message.type) ?? [];
      handlers.forEach((h) => h(message.data));
    };

    this.socket.onclose = () => {
      const delay = Math.min(1000 * 2 ** this.retry, 30000);
      this.retry += 1;
      setTimeout(() => this.connect(), delay);
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  on<T>(type: WSMessageType, handler: EventHandler<T>) {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...existing, handler]);
  }

  send(message: { type: "PONG" }) {
    this.socket?.send(JSON.stringify(message));
  }

  close() {
    this.socket?.close();
  }
}
```

### Usage

```ts
const client = new SayrPublicWSClient(wsUrl);

client.on("UPDATE_TASK", (task) => {
  console.log("Task updated", task);
});

client.on("ERROR", (error) => {
  console.error("WS error", error);
});

client.connect();
```

---

## Notes

- All timestamps are ISO‑8601 strings
- All events are **read‑only** and **PUBLIC**
- Always handle `ERROR`, `PING`, and reconnection logic

---

## React Hook Wrapper (Basic)

A very small, unopinionated React hook built on top of
`SayrPublicWSClient`.

This hook:
- Automatically connects and disconnects
- Handles reconnection and heartbeats via the client
- Lets you register event handlers declaratively

### Hook Implementation

```ts
import { useEffect, useRef } from "react";

export function useSayrPublicWS(
  wsUrl: string,
  handlers: Partial<
    Record<WSMessageType, (payload: any) => void>
  >
) {
  const clientRef = useRef<SayrPublicWSClient | null>(null);

  useEffect(() => {
    if (!wsUrl) return;

    const client = new SayrPublicWSClient(wsUrl);
    clientRef.current = client;

    Object.entries(handlers).forEach(([type, handler]) => {
      if (handler) {
        client.on(type as WSMessageType, handler);
      }
    });

    client.connect();

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [wsUrl]);

  return clientRef;
}
```

---

### Usage Example

```ts
const ws = useSayrPublicWS(wsUrl, {
  UPDATE_TASK: (task) => {
    console.log("Task updated", task);
  },

  UPDATE_LABELS: (labels) => {
    console.log("Labels updated", labels);
  },

  ERROR: (error) => {
    console.error("WebSocket error", error);
  }
});
```

---

### Notes

- The hook is intentionally minimal
- Event handlers are **not re‑registered** unless `wsUrl` changes
- For advanced usage, prefer the raw `SayrPublicWSClient`
- Works with any state manager (React state, Zustand, Redux, etc.)

---