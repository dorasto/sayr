---
name: command-palette
description: Add, remove, or modify commands and sub-views in the Cmd+K command palette
metadata:
  audience: developers
  workflow: feature-development
---

## What I do

I help you add, remove, or modify commands in the Cmd+K command palette system. This includes creating new command groups, adding sub-views (drill-in pages), setting up auto-drill behavior for route-specific contexts, and adding badges.

## Architecture overview

The command palette is built on `cmdk` and uses a **registration pattern** where route-level components register commands into a global store. A **view stack** enables drill-in navigation (like "Switch organization" or task-specific views).

### Key files

| File | Purpose |
|------|---------|
| `apps/start/src/types/command.ts` | `CommandItem`, `CommandGroup`, `CommandMap` type definitions |
| `apps/start/src/lib/command-store.ts` | TanStack Store: `open`, `registrations`, `createTaskDialog`, `initialView` state + actions |
| `apps/start/src/hooks/useRegisterCommands.ts` | Hook for components to register/unregister commands dynamically |
| `apps/start/src/hooks/use-command-registry.tsx` | Merges all registrations + static base commands, sorts by priority, filters `show === false` |
| `apps/start/src/components/generic/AdminCommand.tsx` | Full command palette UI: search, view stack navigation, sub-views, badge display |
| `apps/start/src/hooks/useCommandSearch.tsx` | Debounced server-side task search |
| `packages/ui/src/components/command.tsx` | Shadcn Command UI primitives (`CommandDialog`, `CommandInput` with `icon`/`badge` props, etc.) |

### Command hook files (one per route context)

| File | Context | Registered when |
|------|---------|-----------------|
| `apps/start/src/hooks/commands/useGlobalCommands.tsx` | Any admin page | Always (inside admin layout) |
| `apps/start/src/hooks/commands/useOrgCommands.tsx` | Inside an org | `/$orgId/*` routes |
| `apps/start/src/hooks/commands/useTasksCommands.tsx` | Tasks list page | `/$orgId/tasks` route |
| `apps/start/src/hooks/commands/useTaskCommands.tsx` | Single task page | `/$orgId/tasks/$taskShortId` route |

### Registrar components (rendered in route layouts)

Each route layout renders a small null-component that calls the corresponding hook:

| Route file | Registrar |
|-----------|-----------|
| `apps/start/src/routes/(admin)/route.tsx` | `GlobalCommandRegistrar` |
| `apps/start/src/routes/(admin)/$orgId/route.tsx` | `OrgCommandRegistrar` |
| `apps/start/src/routes/(admin)/$orgId/tasks/route.tsx` | `TasksCommandRegistrar` |
| `apps/start/src/routes/(admin)/$orgId/tasks/$taskShortId/route.tsx` | `TaskCommandRegistrar` |

## Type definitions

```typescript
// apps/start/src/types/command.ts
type CommandItem = {
  id: string;              // Unique ID, also used as cmdk value for deduplication
  label: string;           // Display text AND included in keywords for search
  icon?: ReactNode;        // Icon rendered before label
  shortcut?: string;       // Keyboard shortcut badge (e.g. "C")
  subId?: string;          // If set, selecting pushes this view ID onto the stack
  action?: () => void;     // Executed on select (mutually exclusive with subId in practice)
  closeOnSelect?: boolean; // Close palette after action (default: true)
  show?: boolean;          // Set to false to hide (filtered out by registry)
  value?: string;          // Optional value for cmdk filtering (currently unused — id is used instead)
  keywords?: string;       // Extra search terms (e.g. "new create add")
  metadata?: ReactNode;    // Rendered on the right side of the item
};

type CommandGroup = {
  heading: string;         // Group heading text
  items: CommandItem[];
  priority?: number;       // Lower = appears first. Default 50. Context-aware groups use 5-10.
};

type CommandMap = Record<string, CommandGroup[]>;
// Keys are view IDs: "root" for the main view, any string for sub-views
```

## Store state

```typescript
// apps/start/src/lib/command-store.ts
interface CommandStoreState {
  open: boolean;
  registrations: Record<string, CommandMap>;  // sourceId -> CommandMap
  createTaskDialog: { open: boolean; orgId?: string };
  initialView: { viewId: string; label: string } | null;  // Auto-drill on open
}
```

### Store actions

| Action | Description |
|--------|-------------|
| `commandActions.open()` | Open the palette |
| `commandActions.close()` | Close the palette |
| `commandActions.toggle()` | Toggle open/close |
| `commandActions.setOpen(bool)` | Set open state directly |
| `commandActions.registerCommands(sourceId, commandMap)` | Register commands from a source |
| `commandActions.unregisterCommands(sourceId)` | Remove commands from a source |
| `commandActions.openCreateTaskDialog(orgId?)` | Open the global create task dialog |
| `commandActions.closeCreateTaskDialog()` | Close the create task dialog |
| `commandActions.setInitialView(viewId, label)` | Set auto-drill view + badge label |
| `commandActions.clearInitialView()` | Clear auto-drill |

## How to add a new command to an existing group

Edit the relevant `use*Commands.tsx` hook. Add a new item to the appropriate group's `items` array:

```typescript
{
  id: "unique-id",                    // Must be globally unique
  label: "Human readable label",
  icon: <IconName size={16} className="opacity-60" aria-hidden="true" />,
  action: () => { /* do something */ },
  keywords: "extra search terms",
  shortcut: "K",                      // Optional keyboard shortcut display
}
```

The `id` is critical — it's used as cmdk's `value` prop for deduplication. The `label` is automatically included in search keywords by `AdminCommand.tsx`.

## How to add a new command group

In your hook's `CommandMap`, add a new `CommandGroup` to the `root` array (or any view ID):

```typescript
const commands: CommandMap = useMemo(() => ({
  root: [
    {
      heading: "My Group",
      priority: 20,        // Lower = higher in the list
      items: [ /* CommandItems */ ],
    },
  ],
}), [deps]);
```

Priority guidelines:
- `5` — Current context (e.g. task-specific commands)
- `10` — Org-level and quick actions
- `50` — Navigation (default)
- `60` — Account settings

## How to create a sub-view (drill-in page)

Sub-views work like "Switch organization" — selecting an item replaces all content with a new view, with back navigation.

### Step 1: Define a root item with `subId`

```typescript
{
  id: "my-drill-trigger",
  label: "Open sub-view",
  icon: <IconArrowRight size={16} className="opacity-60" aria-hidden="true" />,
  subId: "my-sub-view",    // This pushes "my-sub-view" onto the view stack
  keywords: "drill navigate",
}
```

### Step 2: Register commands under the sub-view ID

```typescript
const commands: CommandMap = useMemo(() => ({
  root: [
    { heading: "Main", priority: 10, items: [triggerItem] },
  ],
  "my-sub-view": [
    { heading: "Sub-view Items", priority: 10, items: [/* items shown in the sub-view */] },
  ],
}), [deps]);
```

When the user selects the trigger item, the palette navigates to "my-sub-view" and shows those items. Backspace (empty search) or the back arrow returns to root.

### Sub-view badge

Badges only appear when a route explicitly sets `initialView` via `commandActions.setInitialView(viewId, label)`. Generic sub-views (like "Switch organization") do **not** get a badge — only sub-views tied to a specific route context (like a task page showing `OrgName/#5`) will display one.

The badge renders as a small rounded label between the back arrow and the search input in the `CommandInput` component.

## How to auto-drill into a sub-view on open

When a route should automatically open the palette drilled into a specific sub-view (e.g. task page opens to task commands):

### In your command hook:

```typescript
import { useEffect } from "react";
import { commandActions } from "@/lib/command-store";

export function useMyCommands() {
  const subViewId = "my-context-view";
  const badgeLabel = "Context/#123";  // Shown in the search bar badge

  // Set initial view on mount, clear on unmount
  useEffect(() => {
    commandActions.setInitialView(subViewId, badgeLabel);
    return () => {
      commandActions.clearInitialView();
    };
  }, [subViewId, badgeLabel]);

  // Register commands with both root entry (for re-entry) and sub-view items
  const commands: CommandMap = useMemo(() => ({
    root: [
      {
        heading: "My Context",
        priority: 5,
        items: [{
          id: "drill-into-context",
          label: "My Context: Details",
          icon: <IconArrowRight size={16} className="opacity-60" aria-hidden="true" />,
          subId: subViewId,
        }],
      },
    ],
    [subViewId]: [
      {
        heading: "My Context",
        priority: 5,
        items: [/* context-specific commands */],
      },
    ],
  }), [deps]);

  useRegisterCommands("my-commands", commands);
}
```

The root entry is important — it allows users to drill back in after pressing backspace to return to root.

`AdminCommand.tsx` handles the auto-drill: when `open` becomes `true`, it checks `initialView` from the store and, if the sub-view has registered commands, sets the view stack to `["root", initialView.viewId]`.

## How to add a new route-level command hook

1. Create `apps/start/src/hooks/commands/useMyRouteCommands.tsx`
2. Use the pattern from existing hooks — call `useRegisterCommands(sourceId, commands)` with a unique `sourceId`
3. Create a registrar component in the route layout:

```typescript
// In the route file: apps/start/src/routes/(admin)/my-route/route.tsx
import { useMyRouteCommands } from "@/hooks/commands/useMyRouteCommands";

function MyRouteCommandRegistrar() {
  useMyRouteCommands();
  return null;
}

// Render inside the route's context provider:
function MyRouteLayout() {
  return (
    <MyRouteProvider>
      <MyRouteCommandRegistrar />
      <Outlet />
    </MyRouteProvider>
  );
}
```

## How to remove a command

1. Find the hook that registers it (search for the command's `id`)
2. Remove the item from the `items` array
3. If removing the last item in a group, remove the entire group
4. If removing the last group under a view ID, remove the view ID key from the `CommandMap`

## How to conditionally show/hide a command

Use the `show` property on a `CommandItem`:

```typescript
{
  id: "conditional-cmd",
  label: "Only when condition",
  action: () => {},
  show: someCondition,  // false = hidden, true/undefined = visible
}
```

The registry filters out items where `show === false` and removes empty groups.

## Important implementation details

### Deduplication
`cmdk` deduplicates items by their `value` prop. We pass `item.id` as the value (not `item.label`) to avoid conflicts when multiple groups have items with the same label (e.g. "Create task" appears in both global and org groups).

### Search matching
Since `value` is the opaque `id`, the label is included in the `keywords` array so cmdk can still match it during filtering: `keywords={[item.label, ...(item.keywords ? [item.keywords] : [])]}`.

### View stack
The view stack is an array of view IDs, starting with `["root"]`. Selecting an item with `subId` pushes that ID. Backspace (empty search), ArrowLeft, or clicking the back arrow pops the stack. The "Go back" navigation item at the bottom of sub-views also pops the stack.

### Context providers available at each level
- `useLayoutData()` — `account`, `organizations`, `ws`
- `useLayoutOrganization()` — `organization`, `labels`, `views`, `categories`, `issueTemplates`, `releases`
- `useLayoutTasks()` — `tasks`, `setTasks`
- `useLayoutTask()` — `task`, `setTask`

Use these to access data for commands at the appropriate route level.

## When to use me

Use this skill when:
- Adding new commands to the Cmd+K palette
- Creating a new sub-view / drill-in page
- Making a route auto-drill into a sub-view on open
- Removing or modifying existing commands
- Adding badge labels to sub-views
- Troubleshooting command palette behavior (deduplication, search, navigation)
- Adding a new route-level command hook

## What I need from you

Tell me:
1. **What action** — Add, remove, or modify commands
2. **Which context** — Global, org-level, tasks list, single task, or a new route
3. **Command details** — Label, icon, action, keywords, shortcut, sub-view behavior
4. **Badge label** (if sub-view) — What text to show in the search bar when drilled in
