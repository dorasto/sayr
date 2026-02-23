---
name: right-panel
description: Add, modify, or troubleshoot the right sidebar panel on admin pages
metadata:
  audience: developers
  workflow: feature-development
---

## What I do

I help you add, modify, or troubleshoot the right sidebar panel on admin pages. This includes creating panel header and body components, integrating them with the `PanelWrapper` layout component, and managing open/close state.

## Architecture overview

The right panel uses a **props-based pattern**: each page creates its own panel header and body components and passes them directly to `PanelWrapper` as props. There is no global store, no registration system, and no cross-route shared state. Each route fully owns its own panel content.

### How it works

1. A **panel file** (e.g. `panels/tasks.tsx`) exports a header component and a body component
2. The **page component** imports those components and passes them as `panelHeader` and `panelBody` props to `<PanelWrapper>`
3. `PanelWrapper` renders the header in a fixed `h-11 border-b` zone and the body in a scrollable area below
4. When neither `panelHeader` nor `panelBody` is provided, `PanelWrapper` renders just its children (no resizable group)

### Key files

| File | Purpose |
|------|---------|
| `apps/start/src/components/generic/wrapper.tsx` | `PanelWrapper` component (resizable panel layout + mobile Sheet) |

### Existing panel implementations

| File | Route | Content |
|------|-------|---------|
| `apps/start/src/components/admin/panels/tasks.tsx` | `/$orgId/tasks` (tasks list) | Overview tiles, saved views/releases/priority tabs, view editing Sheet |
| `apps/start/src/components/admin/panels/task.tsx` | `/$orgId/tasks/$taskShortId` (task detail) | Task metadata sidebar using `TaskContentSideContent` |

### Page integration points

| Page file | Panel components used |
|-----------|---------------------|
| `apps/start/src/components/pages/admin/orgid/tasks/index.tsx` | `TasksPanelHeader`, `TasksPanelContent` |
| `apps/start/src/components/pages/admin/orgid/tasks/taskId.tsx` | `TaskPanelHeader`, `TaskPanelContent` |

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
| `panelHeader` | `ReactNode` | — | Fixed header rendered at the top of the panel (`h-11`, `border-b`) |
| `panelBody` | `ReactNode` | — | Body content rendered inside the scrollable panel area |
| `panelDefaultSize` | `number` | `30` | Default panel width (percentage) |
| `panelMinSize` | `number` | `15` | Minimum panel width (percentage) |
| `className` | `string` | — | Classes on `ResizablePanelGroup` root |
| `contentClassName` | `string` | — | Classes on the main (left) content panel |

### Behavior

- **Desktop**: Renders a `ResizablePanelGroup` with the page content on the left and panel on the right, separated by a `ResizableHandle`
- **Mobile**: Renders children normally + a `Sheet` overlay for the panel
- **No panel props**: When neither `panelHeader` nor `panelBody` is provided, returns just `{children}` with no wrapping
- **SidebarContext**: Wraps panel content in `<SidebarContext.Provider value={{ id: "panel-right", isCollapsed: false }}>` so doras-ui `SidebarMenu*` components work inside the panel
- **Sidebar store**: Registers a `"panel-right"` entry in the sidebar store on mount

### Panel content layout

When panel content is provided, `PanelWrapper` renders:

1. **Header zone** (if `panelHeader` is provided): `h-11 shrink-0 border-b px-3` — height-matched to `PageHeader.Identity`
2. **Body area** (if `panelBody` is provided): `flex flex-col gap-2 flex-1 overflow-y-auto p-2` — scrollable

## How to add panel content to a new page

### Step 1: Create the panel component file

Create `apps/start/src/components/admin/panels/<your-panel>.tsx`:

```typescript
"use client";

// Optional: Fixed header component, height-matched to PageHeader.Identity
export function MyPanelHeader() {
  return (
    <div className="flex items-center gap-2 w-full flex-1 min-w-0">
      {/* Avatar, title, action buttons, etc. */}
      <span className="text-xs font-medium truncate">Panel Title</span>
    </div>
  );
}

// Interactive content component (manages its own state, uses context hooks)
export function MyPanelContent() {
  // Use context hooks, state, click handlers, etc.
  return <div>Panel content here</div>;
}
```

### Step 2: Pass panel components as props to PanelWrapper

In the page component:

```typescript
import { PanelWrapper } from "@/components/generic/wrapper";
import { PageHeader } from "@/components/generic/PageHeader";
import { MyPanelHeader, MyPanelContent } from "@/components/admin/panels/my-panel";
import { useLayoutOrganization } from "@/contexts/ContextOrg";

export default function MyPage() {
  const { isProjectPanelOpen, setProjectPanelOpen } = useLayoutOrganization();

  return (
    <PanelWrapper
      isOpen={isProjectPanelOpen}
      setOpen={setProjectPanelOpen}
      panelHeader={<MyPanelHeader />}
      panelBody={<MyPanelContent />}
    >
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

For panels where users click tiles/tabs to trigger actions (like filtering), the component manages its own `useState` and calls shared hooks like `useTaskViewManager`.

```typescript
export function TasksPanelContent() {
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
```

### Pattern 2: Data display panel using existing components (Task detail)

For panels that display structured data, compose existing components. The `TaskPanelContent` delegates to `TaskContentSideContent`, pulling data from context hooks.

```typescript
export function TaskPanelContent() {
  const { task, setTask } = useLayoutTask();
  const { organization, labels, categories, releases } = useLayoutOrganization();
  const { tasks, setTasks } = useLayoutTasks();

  return (
    <TaskContentSideContent
      task={task}
      labels={labels}
      tasks={tasks}
      setTasks={setTasks}
      setSelectedTask={(t) => t && setTask(t)}
      availableUsers={organization?.members.map((m) => m.user) || []}
      // ...other props
    />
  );
}
```

### Pattern 3: SidebarMenu components

`SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` from doras-ui work inside the panel because `PanelWrapper` provides the required `SidebarContext`.

## Panel open/close state

The panel open/close state is managed externally (not by the panel system itself). Currently, the tasks pages use `isProjectPanelOpen` / `setProjectPanelOpen` from `useLayoutOrganization()`, which is persisted via `useStateManagement("isProjectPanelOpen", true, 30000)`.

When adding a panel to a new page:
- Reuse `isProjectPanelOpen` if the page is within an org context
- Or create a new persisted preference via `useStateManagement` if it should be independent
- Pass the state as `isOpen` / `setOpen` props to `PanelWrapper`

## Context providers available to panel components

Panel components are rendered inside the page component tree, so they have access to all context providers that wrap the page. For task pages:

- `useLayoutData()` — `account`, `organizations`, `ws`
- `useLayoutOrganization()` — `organization`, `labels`, `views`, `categories`, `releases`, `isProjectPanelOpen`, `setProjectPanelOpen`
- `useLayoutTasks()` — `tasks`, `setTasks`
- `useLayoutTask()` — `task`, `setTask` (only on `/$orgId/tasks/$taskShortId`)

Since panel components are passed as JSX props (`<MyPanelContent />`), they are instantiated in the page component's render, which means they inherit all context from the page's provider tree. No special mounting considerations are needed.

## Rules

1. **PanelWrapper wraps the entire page** including PageHeader — the panel sits beside everything at full height
2. **Panel header is `h-11 border-b`** — height-matched to `PageHeader.Identity` for horizontal alignment
3. **Panel components are passed as props** — use `panelHeader` and `panelBody`, not a registration system
4. **Each page owns its panel** — no shared global state between routes
5. **For interactive content**, use a React component that manages its own state via hooks
6. **SidebarMenu components work** inside the panel because `PanelWrapper` provides `SidebarContext`
7. **Panel toggle button** should use `IconLayoutSidebarRight` / `IconLayoutSidebarRightFilled` icons
8. **Panel files export components** — header and body are exported as named exports from `panels/*.tsx`

## When to use me

Use this skill when:
- Adding a right panel to a new page
- Creating panel header or body components
- Creating interactive panel content (tiles, tabs, filters)
- Creating data-display panel content (metadata sidebar)
- Modifying panel headers or layout
- Troubleshooting panel rendering or context issues

## What I need from you

Tell me:
1. **Which page** — New page or existing? Which route?
2. **Panel content** — What should appear in the panel? (data display, interactive tiles, etc.)
3. **Header** — What should the panel header show? (avatar + title, action buttons, etc.)
4. **Context** — What context providers does the panel content need? (org, tasks, etc.)
5. **Open state** — Reuse `isProjectPanelOpen` or new independent state?
