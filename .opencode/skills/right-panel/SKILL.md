---
name: right-panel
description: Add, modify, or troubleshoot the global right sidebar panel system on admin pages
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: feature-development
---

## What I do

I help you add, modify, or troubleshoot the global right sidebar panel system. This includes registering new panel content for any route, creating panel header components, adding interactive sections, and integrating with the `PanelWrapper` layout component.

## Architecture overview

The right panel uses a **registration pattern** (identical to the command palette): route-level components register content into a global TanStack Store, and `PanelWrapper` reads from that store to render the panel. Content is automatically cleaned up when the registering component unmounts.

### How it works

1. A **registrar component** (e.g. `TasksPanelRegistrar`) is mounted inside a route layout, within the appropriate context providers
2. The registrar calls `useRegisterPanel(sourceId, registration)` which pushes content into the panel store on mount and removes it on unmount
3. The **page component** wraps its content in `<PanelWrapper isOpen={...} setOpen={...}>` which reads from the store via `usePanelRegistry()`
4. `PanelWrapper` renders the registered content in a resizable right column (desktop) or a Sheet (mobile)
5. When no panel content is registered, `PanelWrapper` renders just its children (no resizable group)

### Key files

| File | Purpose |
|------|---------|
| `apps/start/src/types/panel.ts` | `PanelSection` and `PanelRegistration` type definitions |
| `apps/start/src/lib/panel-store.ts` | TanStack Store singleton with `panelActions.registerPanel()` / `unregisterPanel()` |
| `apps/start/src/hooks/useRegisterPanel.ts` | Lifecycle hook: registers on mount, unregisters on unmount |
| `apps/start/src/hooks/usePanelRegistry.ts` | Merge hook: combines all registrations, deduplicates, sorts by priority |
| `apps/start/src/components/generic/wrapper.tsx` | `PanelWrapper` component (resizable panel layout + mobile Sheet) |

### Existing panel implementations

| File | Route | Content |
|------|-------|---------|
| `apps/start/src/components/admin/panels/tasks.tsx` | `/$orgId/tasks` (tasks list) | Overview tiles, saved views/releases/priority tabs, view editing Sheet |
| `apps/start/src/components/admin/panels/task.tsx` | `/$orgId/tasks/$taskShortId` (task detail) | Status, priority, dates, GitHub link using SidebarMenu components |

### Registrar mount points

| Route file | Registrar | Context required |
|-----------|-----------|-----------------|
| `apps/start/src/routes/(admin)/$orgId/tasks/route.tsx` | `TasksPanelRegistrar` | `RootProviderOrganizationTasks` |
| `apps/start/src/routes/(admin)/$orgId/tasks/$taskShortId/route.tsx` | `TaskPanelRegistrar` | `RootProviderOrganizationTask` |

## Type definitions

```typescript
// apps/start/src/types/panel.ts

type PanelSection = {
  id: string;        // Unique ID for deduplication
  title?: string;    // Section heading (rendered as small muted text above content)
  content: ReactNode; // Section content
  priority?: number; // Lower = appears first. Default is 50.
  show?: boolean;    // Set to false to hide (filtered out by registry)
};

type PanelRegistration = {
  sections: PanelSection[];
  title?: string;    // Fallback header label (used when `header` is not set)
  icon?: ReactNode;  // Fallback header icon (used when `header` is not set)
  header?: ReactNode; // Fixed header in h-11 border-b zone, height-matched to PageHeader.Identity
};
```

## Store state

```typescript
// apps/start/src/lib/panel-store.ts

interface PanelStoreState {
  registrations: Record<string, PanelRegistration>; // sourceId -> PanelRegistration
}
```

### Store actions

| Action | Description |
|--------|-------------|
| `panelActions.registerPanel(sourceId, registration)` | Register panel content from a source |
| `panelActions.unregisterPanel(sourceId)` | Remove panel content from a source |

## PanelWrapper component API

`PanelWrapper` is the layout component that pages opt into. It wraps the **entire page content including PageHeader** so the panel column sits beside everything at full height.

```tsx
import { PanelWrapper } from "@/components/generic/wrapper";
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Main page content (left side) |
| `isOpen` | `boolean` | Required | Whether the panel is open |
| `setOpen` | `(open: boolean) => void` | Required | Toggle callback |
| `panelDefaultSize` | `number` | `30` | Default panel width (percentage) |
| `panelMinSize` | `number` | `20` | Minimum panel width (percentage) |
| `className` | `string` | — | Classes on `ResizablePanelGroup` root |
| `contentClassName` | `string` | — | Classes on the main (left) content panel |

### Behavior

- **Desktop**: Renders a `ResizablePanelGroup` with the page content on the left and panel on the right, separated by a `ResizableHandle`
- **Mobile**: Renders children normally + a `Sheet` overlay for the panel
- **No registrations**: Returns just `{children}` with no wrapping
- **SidebarContext**: Wraps panel content in `<SidebarContext.Provider value={{ id: "panel-right", isCollapsed: false }}>` so doras-ui `SidebarMenu*` components work inside the panel
- **Sidebar store**: Registers a `"panel-right"` entry in the sidebar store on mount

### Panel content layout

When panel content is registered, `PanelWrapper` renders:

1. **Header zone** (if `registry.header` exists): `h-11 shrink-0 border-b px-3` — height-matched to `PageHeader.Identity`
2. **Fallback header** (if `registry.title` exists but no `header`): icon + title text
3. **Sections area**: `flex flex-col gap-2 flex-1 overflow-y-auto p-2` — scrollable, each section renders its `title` (if present) and `content`

## How to add panel content to a new page

### Step 1: Create the panel component file

Create `apps/start/src/components/admin/panels/<your-panel>.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import { useRegisterPanel } from "@/hooks/useRegisterPanel";

// Optional: Fixed header component, height-matched to PageHeader.Identity
function MyPanelHeader() {
  return (
    <div className="flex items-center gap-2 w-full flex-1 min-w-0">
      {/* Avatar, title, action buttons, etc. */}
      <span className="text-xs font-medium truncate">Panel Title</span>
    </div>
  );
}

// Interactive content component (manages its own state)
function MyPanelContent() {
  // Use context hooks, state, click handlers, etc.
  return <div>Panel content here</div>;
}

// Hook that creates the registration
export function useMyPanel() {
  const registration = useMemo(
    () => ({
      header: <MyPanelHeader />,
      sections: [
        {
          id: "my-panel-content",
          priority: 10,
          content: <MyPanelContent />,
        },
      ],
    }),
    [],
  );

  useRegisterPanel("my-panel", registration);
}

// Null-rendering registrar component
export function MyPanelRegistrar() {
  useMyPanel();
  return null;
}
```

### Step 2: Mount the registrar in the route layout

In the route file (e.g. `apps/start/src/routes/(admin)/$orgId/my-route/route.tsx`):

```typescript
import { MyPanelRegistrar } from "@/components/admin/panels/my-panel";

function MyRouteLayout() {
  return (
    <MyContextProvider>
      <MyPanelRegistrar />  {/* Must be inside required context providers */}
      <Outlet />
    </MyContextProvider>
  );
}
```

### Step 3: Wrap the page content in PanelWrapper

In the page component:

```typescript
import { PanelWrapper } from "@/components/generic/wrapper";
import { PageHeader } from "@/components/generic/PageHeader";
import { useLayoutOrganization } from "@/contexts/ContextOrg";

export default function MyPage() {
  const { isProjectPanelOpen, setProjectPanelOpen } = useLayoutOrganization();

  return (
    <PanelWrapper isOpen={isProjectPanelOpen} setOpen={setProjectPanelOpen}>
      <div className="relative flex flex-col h-full max-h-full">
        <PageHeader>
          <PageHeader.Identity ... />
          <PageHeader.Toolbar
            right={
              <>
                {/* Panel toggle button */}
                <Button
                  variant="accent"
                  className="gap-2 h-6 w-fit bg-accent border-transparent p-1"
                  onClick={() => setProjectPanelOpen(!isProjectPanelOpen)}
                >
                  {isProjectPanelOpen ? (
                    <IconLayoutSidebarRightFilled />
                  ) : (
                    <IconLayoutSidebarRight />
                  )}
                </Button>
              </>
            }
          />
        </PageHeader>
        <div className="flex-1 overflow-y-auto h-full flex flex-col relative">
          {/* Page content */}
        </div>
      </div>
    </PanelWrapper>
  );
}
```

**Critical**: `PanelWrapper` must wrap the **entire page content including PageHeader**. The panel column sits beside everything at full height, not below the header.

## Patterns

### Pattern 1: Interactive panel with state (Tasks list)

For panels where users click tiles/tabs to trigger actions (like filtering), put a full React component as the section content. The component manages its own `useState` and calls shared hooks like `useTaskViewManager`.

```typescript
function TasksPanelContent() {
  const [editingView, setEditingView] = useState(null);
  const { applyFilter, selectView, clearView } = useTaskViewManager(views);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Clickable tiles */}
      <Tile onClick={() => clearView()}>...</Tile>
      {/* Tabs with views/releases/priority */}
      <Tabs>...</Tabs>
      {/* Editing Sheet */}
      <Sheet open={!!editingView} onOpenChange={...}>...</Sheet>
    </div>
  );
}

export function useTasksPanel() {
  const registration = useMemo(() => ({
    header: <TasksPanelHeader />,
    sections: [{
      id: "tasks-panel-content",
      priority: 10,
      content: <TasksPanelContent />,
    }],
  }), []);

  useRegisterPanel("tasks-panel", registration);
}
```

### Pattern 2: Data display panel with SidebarMenu (Task detail)

For panels that display structured data (like task metadata), use `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` from doras-ui. These work inside the panel because `PanelWrapper` provides the required `SidebarContext`.

```typescript
export function useTaskPanel() {
  const { task } = useLayoutTask();
  const statusCfg = statusConfig[task.status as StatusKey];

  const registration = useMemo(() => ({
    header: <TaskPanelHeader />,
    sections: [
      {
        id: "task-status",
        title: "Details",
        priority: 10,
        content: (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton icon={statusCfg.icon("size-4")}>
                <span className="flex-1">Status</span>
                <span className="text-xs text-muted-foreground">{statusCfg.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ),
      },
    ],
  }), [statusCfg]);

  useRegisterPanel("task-panel", registration);
}
```

### Pattern 3: Simple title/icon fallback (no header component)

For panels that don't need a custom header component, use `title` and `icon` on the registration. `PanelWrapper` renders a simple icon + title row.

```typescript
const registration = useMemo(() => ({
  title: "Release Details",
  icon: <IconRocket className="size-4" />,
  sections: [
    { id: "release-info", priority: 10, content: <ReleaseInfo /> },
  ],
}), []);
```

### Pattern 4: Multiple sections with different priorities

Registrations can have multiple sections. Sections from all active registrations are merged, deduplicated by `id`, and sorted by `priority`.

```typescript
const registration = useMemo(() => ({
  header: <MyHeader />,
  sections: [
    { id: "overview", title: "Overview", priority: 10, content: <Overview /> },
    { id: "details", title: "Details", priority: 20, content: <Details /> },
    { id: "actions", title: "Actions", priority: 30, content: <Actions /> },
  ],
}), []);
```

### Pattern 5: Conditional sections

Use `show` to conditionally hide sections without changing the registration structure:

```typescript
sections: [
  { id: "github", title: "GitHub", priority: 30, content: <GitHubInfo />, show: !!task.githubIssue },
]
```

## Panel open/close state

The panel open/close state is managed externally (not by the panel system itself). Currently, the tasks pages use `isProjectPanelOpen` / `setProjectPanelOpen` from `useLayoutOrganization()`, which is persisted via `useStateManagement("isProjectPanelOpen", true, 30000)`.

When adding a panel to a new page:
- Reuse `isProjectPanelOpen` if the page is within an org context
- Or create a new persisted preference via `useStateManagement` if it should be independent
- Pass the state as `isOpen` / `setOpen` props to `PanelWrapper`

## Multiple simultaneous registrations

Multiple routes can register panel content simultaneously. The registry merges all registrations:
- Sections from all registrations are combined into one flat list
- Sections are deduplicated by `id` (first occurrence wins)
- Sorted by `priority` (lower = first)
- Sections with `show === false` are filtered out
- The first registration with a `header` provides the panel header
- The first registration with a `title` provides the fallback title

This enables nested route layouts (e.g. tasks list + task detail) to contribute content to the same panel.

## Context providers available at each level

When creating a panel registrar, you can use these context hooks depending on where the registrar is mounted:

- `useLayoutData()` — `account`, `organizations`, `ws`
- `useLayoutOrganization()` — `organization`, `labels`, `views`, `categories`, `releases`, `isProjectPanelOpen`, `setProjectPanelOpen`
- `useLayoutTasks()` — `tasks`, `setTasks`
- `useLayoutTask()` — `task`, `setTask`

The registrar must be mounted **inside** the context provider it depends on.

## Rules

1. **PanelWrapper wraps the entire page** including PageHeader — the panel sits beside everything at full height
2. **Panel header is `h-11 border-b`** — height-matched to `PageHeader.Identity` for horizontal alignment
3. **Registrar goes in the route layout**, not in the page component — it must be inside the required context providers
4. **sourceId must be unique** per registration (e.g. `"tasks-panel"`, `"task-panel"`, `"release-panel"`)
5. **Section IDs must be unique** across all registrations — duplicates are silently dropped
6. **For interactive content**, use a React component as `content` (not static JSX in `useMemo`) so it can manage its own state
7. **SidebarMenu components work** inside the panel because `PanelWrapper` provides `SidebarContext`
8. **Panel toggle button** should use `IconLayoutSidebarRight` / `IconLayoutSidebarRightFilled` icons

## When to use me

Use this skill when:
- Adding a right panel to a new page
- Adding new sections to an existing panel
- Creating interactive panel content (tiles, tabs, filters)
- Creating data-display panel content (SidebarMenu metadata)
- Modifying panel headers or layout
- Troubleshooting panel registration or context issues
- Understanding how the panel store merges multiple registrations

## What I need from you

Tell me:
1. **Which page** — New page or existing? Which route?
2. **Panel content** — What should appear in the panel? (data display, interactive tiles, etc.)
3. **Header** — Custom header component, or simple title/icon fallback?
4. **Context** — What context providers does the panel content need? (org, tasks, etc.)
5. **Open state** — Reuse `isProjectPanelOpen` or new independent state?
