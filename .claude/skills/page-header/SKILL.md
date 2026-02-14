---
name: page-header
description: Add or modify PageHeader layouts on admin pages, including task view integration and cross-org patterns
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: feature-development
---

## What I do

I help you add, modify, or troubleshoot the `PageHeader` component used on every admin page. This includes setting up the identity zone (icon, title, breadcrumbs, actions), the toolbar zone (filters, view controls), and integrating with the task view system (`UnifiedTaskView`, `TaskFilterDropdown`, `TaskViewDropdown`).

## Architecture overview

Every admin page renders a `PageHeader` at the top with a consistent `h-11` height per zone. The component has two zones:

- **Zone 1 (Identity)** -- Page icon/title or breadcrumbs, plus optional right-side actions
- **Zone 2 (Toolbar)** -- Optional. Left side for filters/badges, right side for view controls

### Key files

| File | Purpose |
|------|---------|
| `apps/start/src/components/generic/PageHeader.tsx` | `PageHeader`, `PageHeader.Identity`, `PageHeader.Toolbar` components |
| `apps/start/src/components/tasks/views/unified-task-view.tsx` | `UnifiedTaskView` -- renders both list and kanban views with grouping, filtering, drag-and-drop |
| `apps/start/src/components/tasks/views/unified-task-item.tsx` | `UnifiedTaskItem` -- single task row/card, supports `personal` prop for org badges |
| `apps/start/src/components/tasks/views/TaskViewDropdown.tsx` | `TaskViewDropdown` -- grouping, sub-grouping, view mode, completed tasks toggle |
| `apps/start/src/components/tasks/filter/TaskFilterDropdown.tsx` | `TaskFilterDropdown` -- filter badges + filter menu + save view popover |
| `apps/start/src/hooks/useTaskViewManager.ts` | Shared state for filters, grouping, viewMode via TanStack Store + URL params |

## Component API

### `PageHeader`

Container. Renders a sticky header with `z-30`, `bg-background`. On mobile, adds a `SidebarTrigger` above the children.

```tsx
<PageHeader className="optional-extra-classes">
  {/* Zone 1 and Zone 2 children */}
</PageHeader>
```

### `PageHeader.Identity`

Zone 1. Fixed height `h-11`. Two usage modes:

**Mode A: icon + title (simple pages)**

```tsx
<PageHeader.Identity
  icon={<IconUser className="size-4" />}
  title="My Tasks"
  actions={<Button>New</Button>}  // optional, rendered on the right
/>
```

**Mode B: children (custom breadcrumbs)**

When `children` is provided, `icon` and `title` are ignored. Use this for breadcrumb navigation:

```tsx
<PageHeader.Identity actions={<CreateButton />}>
  <Link to="/$orgId/tasks" params={{ orgId }}>
    <Button variant="primary" className="text-xs p-1 h-auto rounded-lg bg-transparent" size="sm">
      <Avatar className="h-4 w-4">...</Avatar>
      <span>{organization.name}</span>
    </Button>
  </Link>
  <span className="text-muted-foreground text-xs">/</span>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="primary" className="text-xs p-1 h-auto rounded-lg bg-transparent gap-1">
        {CurrentViewIcon}
        <span>{currentViewName}</span>
        <IconChevronDown className="size-3" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>...</DropdownMenuContent>
  </DropdownMenu>
</PageHeader.Identity>
```

Props:

| Prop | Type | Description |
|------|------|-------------|
| `icon` | `ReactNode` | Icon/avatar before the title |
| `title` | `ReactNode` | Page title text |
| `children` | `ReactNode` | Custom content (replaces icon+title) |
| `actions` | `ReactNode` | Right-side actions (buttons, badges) |
| `className` | `string` | Extra classes |

### `PageHeader.Toolbar`

Zone 2. Fixed height `h-11` with `border-b`. Two usage modes:

**Mode A: left + right (standard)**

```tsx
<PageHeader.Toolbar
  left={<TaskFilterDropdown ... />}
  right={
    <>
      <Separator orientation="vertical" className="h-5" />
      <TaskViewDropdown />
    </>
  }
/>
```

**Mode B: children (fully custom)**

```tsx
<PageHeader.Toolbar>
  <div>Custom toolbar content</div>
</PageHeader.Toolbar>
```

Props:

| Prop | Type | Description |
|------|------|-------------|
| `left` | `ReactNode` | Left side (filters, badges) |
| `right` | `ReactNode` | Right side (view dropdown, toggles) |
| `children` | `ReactNode` | Custom content (replaces left+right) |
| `className` | `string` | Extra classes |

## Usage patterns

### Pattern 1: Simple page (no toolbar)

Used by Home, Settings pages. Just identity zone.

```tsx
// apps/start/src/components/pages/admin/home/index.tsx
<PageHeader>
  <PageHeader.Identity
    icon={<IconHome className="size-4" />}
    title={`Welcome, ${name}`}
  />
</PageHeader>
```

### Pattern 2: Task list with toolbar (single org)

Used by `orgid/tasks/index.tsx`. Full breadcrumb identity with category/view switcher dropdown, filter toolbar, view controls, and side panel toggle.

```tsx
// apps/start/src/components/pages/admin/orgid/tasks/index.tsx
<PageHeader>
  <PageHeader.Identity actions={<CreateIssueDialog ... />}>
    <Link to="/$orgId/tasks" ...>
      <Button ...><Avatar .../><span>{organization.name}</span></Button>
    </Link>
    <span className="text-muted-foreground text-xs">/</span>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ...>{CurrentViewIcon}<span>{currentViewName}</span><IconChevronDown /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* All tasks, Your tasks, Categories, Custom Views */}
      </DropdownMenuContent>
    </DropdownMenu>
  </PageHeader.Identity>
  <PageHeader.Toolbar
    left={
      <TaskFilterDropdown
        tasks={tasks} labels={labels} availableUsers={availableUsers}
        organizationId={organization.id} views={views} setViews={setViews}
        categories={categories} releases={releases}
      />
    }
    right={
      <>
        <Separator orientation="vertical" className="h-5" />
        <TaskViewDropdown />
        <Button onClick={() => setProjectPanelOpen(!isProjectPanelOpen)}>
          {isProjectPanelOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
        </Button>
      </>
    }
  />
</PageHeader>
<UnifiedTaskView
  tasks={tasks} setTasks={setTasks} ws={ws}
  availableUsers={availableUsers} organization={organization}
  categories={categories} releases={releases} views={views}
/>
```

### Pattern 3: Cross-org task list (My Tasks)

Used by `mine/index.tsx`. Simple identity, filter toolbar (no saved views), no side panel. Uses `UnifiedTaskView` in cross-org mode (`personal` prop, no `organization` prop).

```tsx
// apps/start/src/components/pages/admin/mine/index.tsx
<PageHeader>
  <PageHeader.Identity
    icon={<IconUser className="size-4" />}
    title="My Tasks"
  />
  <PageHeader.Toolbar
    left={
      <TaskFilterDropdown
        tasks={tasks} labels={labels} availableUsers={availableUsers}
        categories={categories} releases={releases}
        // No organizationId, views, or setViews -- cross-org mode
      />
    }
    right={
      <>
        <Separator orientation="vertical" className="h-5" />
        <TaskViewDropdown />
      </>
    }
  />
</PageHeader>
<UnifiedTaskView
  tasks={tasks} setTasks={setTasks} ws={ws}
  availableUsers={availableUsers} categories={categories}
  releases={releases} personal
  // No organization prop -- uses task.organizationId per-call
/>
```

### Pattern 4: Identity with actions (Inbox)

Used by `inbox/index.tsx`. Identity zone has badge and mark-all-read button as actions.

```tsx
// apps/start/src/components/pages/admin/inbox/index.tsx
<PageHeader>
  <PageHeader.Identity
    icon={<IconInbox className="size-4" />}
    title="Inbox"
    actions={
      <>
        {unreadCount > 0 && <Badge variant="outline">{unreadCount}</Badge>}
        {unreadCount > 0 && <Button onClick={markAllRead}>Mark all read</Button>}
      </>
    }
  />
</PageHeader>
```

### Pattern 5: Breadcrumb to single item (Task detail)

Used by `orgid/tasks/taskId.tsx`. Identity with breadcrumb children linking back to task list, no toolbar.

```tsx
// apps/start/src/components/pages/admin/orgid/tasks/taskId.tsx
<PageHeader>
  <PageHeader.Identity>
    <Link to="/$orgId/tasks" params={{ orgId: organization.id }}>
      <Button ...><Avatar .../><span>{organization.name}</span></Button>
    </Link>
    <span className="text-muted-foreground text-xs">/</span>
    <span className="text-xs">#{task.shortId}</span>
  </PageHeader.Identity>
</PageHeader>
```

## UnifiedTaskView integration

`UnifiedTaskView` handles both list and kanban rendering. It lives below the `PageHeader` and fills the remaining height.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tasks` | `TaskWithLabels[]` | Yes | Task data |
| `setTasks` | `(tasks) => void` | Yes | State setter for optimistic updates |
| `ws` | `WebSocket \| null` | Yes | WebSocket for real-time updates |
| `availableUsers` | `userType[]` | Yes | Users for assignee display/selection |
| `organization` | `OrganizationWithMembers` | No | When set, uses `organization.id` for all API calls (single-org mode) |
| `categories` | `categoryType[]` | Yes | Categories for grouping/filtering |
| `releases` | `releaseType[]` | No | Releases for grouping/filtering |
| `views` | `savedViewType[]` | No | Saved views for auto-loading view configs |
| `compact` | `boolean` | No | Compact rendering (used in release pages) |
| `forceShowCompleted` | `boolean` | No | Override showCompletedTasks toggle |
| `personal` | `boolean` | No | When true, shows org badges on each task row |

### Single-org vs cross-org mode

**Single-org mode** (org tasks page): Pass `organization` prop. All `updateTaskAction` calls use `organization.id`.

**Cross-org mode** (My Tasks page): Omit `organization` prop. The component uses `getOrgId(taskId)` which looks up `task.organizationId` from the tasks array for each API call. Pass `personal` to show org badges.

### Internal architecture

`UnifiedTaskView` internally manages:
- `useTaskViewManager(views)` -- shared state for filters, grouping, subGrouping, viewMode, showCompletedTasks
- `applyFilters(tasks, filters)` -- client-side filtering
- `applyNestedGrouping(grouping, subGrouping, ...)` -- groups filtered tasks into `NestedTaskGroup[]`
- List view: `TaskGroupSectionHeader` + `UnifiedTaskItem` with collapsible sections
- Kanban view: `GridBoardProvider` with drag-and-drop columns/rows
- WebSocket handlers for `UPDATE_TASK` and `UPDATE_TASK_COMMENTS`

## TaskFilterDropdown integration

`TaskFilterDropdown` renders filter badges + a filter menu popover. It slots into `PageHeader.Toolbar`'s `left` slot.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tasks` | `TaskWithLabels[]` | Yes | Tasks for deriving filter options |
| `labels` | `labelType[]` | Yes | Labels for label filter options |
| `availableUsers` | `userType[]` | Yes | Users for assignee filter options |
| `categories` | `categoryType[]` | Yes | Categories for category filter options |
| `releases` | `releaseType[]` | Yes | Releases for release filter options |
| `organizationId` | `string` | No | When set, enables "Save View" popover |
| `views` | `savedViewType[]` | No | Saved views for duplicate detection |
| `setViews` | `(views) => void` | No | Setter for updating views after save |

When `organizationId`, `views`, or `setViews` are omitted (cross-org mode), the "Save View" popover and share URL clipboard button are hidden. Filtering itself works identically.

## TaskViewDropdown

`TaskViewDropdown` has NO org dependencies. It reads/writes shared state from `useTaskViewManager` and can be used anywhere.

Renders controls for: view mode (list/kanban), primary grouping, sub-grouping, show/hide completed tasks.

## Rules

1. **Every admin page must have a `PageHeader`** at the top of its content area
2. **Height is `h-11` per zone** -- Identity is always `h-11`, Toolbar is always `h-11` when present
3. **Sticky positioning** -- `sticky top-0 z-30` ensures the header stays visible during scroll
4. **Page container pattern** -- Wrap in `<div className="relative flex flex-col h-full max-h-full overflow-hidden">`, with scrollable content below the header
5. **Mobile support** -- `PageHeader` auto-adds a `SidebarTrigger` on mobile. No extra work needed.
6. **Toolbar separator** -- When toolbar has both left and right content, use `<Separator orientation="vertical" className="h-5" />` before the `TaskViewDropdown`

## When to use me

Use this skill when:
- Adding a `PageHeader` to a new admin page
- Modifying the identity zone (changing icon, title, adding breadcrumbs)
- Adding or modifying toolbar content (filters, view controls, action buttons)
- Integrating `UnifiedTaskView` with a page (single-org or cross-org)
- Adding `TaskFilterDropdown` to a page
- Troubleshooting layout issues with the header (height, sticky, z-index)
- Understanding the cross-org (personal/My Tasks) vs single-org pattern

## What I need from you

Tell me:
1. **Which page** -- New page or existing? Which route?
2. **Identity content** -- Simple icon+title, or custom breadcrumbs?
3. **Actions** -- Any right-side buttons/badges in the identity zone?
4. **Toolbar** -- Needed? What goes in left vs right?
5. **Task view** -- Does this page render `UnifiedTaskView`? Single-org or cross-org?
