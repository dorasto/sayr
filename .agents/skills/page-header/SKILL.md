---
name: page-header
description: Add or modify PageHeader layouts on admin pages, including the board's toolbar controls on task list pages
metadata:
  audience: developers
  workflow: feature-development
---

## What I do

I help you add, modify, or troubleshoot the `PageHeader` component used on every admin page. This includes setting up the identity zone (icon, title, breadcrumbs, actions), the toolbar zone (filters, view controls), and wiring the shared board's controls (`FilterBuilder`, `BoardViewOptions`, `TaskCountLabel`, `ActiveViewSwitcher`) into it on task list pages — the board itself is covered by the `board` skill. For the side panel a page's toolbar toggle usually opens, see the `page-component` skill — panels are a separate system (`Page` + `sidebar-store`), not part of `PageHeader` itself.

## Architecture overview

Every admin page renders a `PageHeader` at the top with a consistent `h-11` height per zone. The component has two zones:

- **Zone 1 (Identity)** -- Page icon/title or breadcrumbs, plus optional right-side actions
- **Zone 2 (Toolbar)** -- Optional. Left side for filters/badges, right side for view controls

### Key files

| File | Purpose |
|------|---------|
| `apps/start/src/components/generic/PageHeader.tsx` | `PageHeader`, `PageHeader.Identity`, `PageHeader.Toolbar` components |
| `apps/start/src/components/board/filter/filter-builder.tsx` | `FilterBuilder` -- the board's filter popover (toolbar right) |
| `apps/start/src/components/board/layout/board-view-options.tsx` | `BoardViewOptions` -- view mode, group/sub-group, sort, show completed |
| `apps/start/src/components/board/layout/task-count-label.tsx` | `TaskCountLabel` -- visible task count (toolbar left) |
| `apps/start/src/components/board/saved-views/active-view-switcher.tsx` | `ActiveViewSwitcher` -- breadcrumb saved-view switcher (identity zone) |

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
  left={<TaskCountLabel />}
  right={
    <>
      <FilterBuilder />
      <BoardViewOptions />
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

Used by Settings pages. Just identity zone.

```tsx
<PageHeader>
  <PageHeader.Identity icon={<IconSettings className="size-4" />} title="Settings" />
</PageHeader>
```

### Pattern 2: Task list with toolbar (single org)

Used by `orgid/tasks/index.tsx`, which runs on the shared board (same chrome as `/home` — see the `board` skill). The page mounts `TaskBoardProvider` (org task store, `organizationScope`, org saved-views source, scope `org:<id>` / `url+personal`) around an inner component, because the header, toolbar and portalled panel all read the board's context. Identity: org avatar+name link (a plain click calls `clearView()`) / `ActiveViewSwitcher presets={...}` ("Your tasks" + one per category); actions `CreateIssueDialog` + panel toggle. Toolbar: `TaskCountLabel` left, `FilterBuilder` + `BoardViewOptions` right. Panel: `panels.right` with header `{ icon: <ActiveViewPanelHeader />, actions: <ActiveViewPanelActions />, showClose: false }` (the gear opens the view settings sheet for the active view; mounted once inside the provider as `<ViewSettingsSheet />`) and body `OrgTasksPanelContent` (count tiles + `QuickFilterPanel`).

```tsx
// apps/start/src/components/pages/admin/orgid/tasks/index.tsx (inner component, inside TaskBoardProvider)
<Page
  header={header}
  panels={{ right: { id: TASKS_LIST_PANEL_ID, header: { icon: <ActiveViewPanelHeader />, actions: <ActiveViewPanelActions />, showClose: false }, defaultOpen: true, width: "420px" } }}
  className="h-full"
>
  {/* header: <PageHeader.Identity actions={<><CreateIssueDialog ... /><PanelToggle /></>}>
        <Link to="/$orgId/tasks" onClick={clearView on plain click}>...org avatar + name...</Link> /
        <ActiveViewSwitcher presets={presets} />
      </PageHeader.Identity>
      <PageHeader.Toolbar className="border-b-0" left={<TaskCountLabel />}
        right={<><FilterBuilder /><BoardViewOptions /></>} /> */}
  <div className="h-full flex flex-col contain-[paint]">
    <BoardScrollArea />
  </div>
</Page>
```

The panel-open/close toggle button (top-right, next to "New task") calls `panel.isOpen ? closePanel(TASKS_LIST_PANEL_ID) : sidebarActions.setOpen(TASKS_LIST_PANEL_ID, true)` — see the `page-component` skill for the full toggle pattern.

### Pattern 3: Cross-org task list (`/home`)

Used by `home/index.tsx`. Mounts `AdminBoardProvider` (every org the user belongs to, personal saved views); identity carries the `ActiveViewSwitcher` breadcrumb, toolbar is `TaskCountLabel` left and `FilterBuilder` + `BoardViewOptions` right — same toolbar as Pattern 2. No `organizationScope`, so the board offers the `org` filter/grouping.

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
    <span className="text-xs">{formatTaskKey(organization.shortId, task.shortId)}</span>
  </PageHeader.Identity>
</PageHeader>
```

`formatTaskKey` (from `@repo/util`) renders the org-prefixed key (`SAY-123`, no `#`) — this is the display format everywhere a task identifier is shown (list rows, breadcrumbs, mentions, search, command palette, notifications). Don't render a bare `task.shortId` or a `#`-prefixed value anywhere new; use `formatTaskKey(orgShortId, taskShortId)`. The canonical single-source component for a clickable task identifier badge is `apps/start/src/components/tasks/shared/identifier.tsx` (`GlobalTaskIdentifier`) — prefer it over hand-rolling the breadcrumb span when the context allows a link.

## Rules

1. **Every admin page must have a `PageHeader`** at the top of its content area
2. **Height is `h-11` per zone** -- Identity is always `h-11`, Toolbar is always `h-11` when present
3. **Sticky positioning** -- `sticky top-0 z-30` ensures the header stays visible during scroll
4. **Page container pattern** -- Wrap in `<div className="relative flex flex-col h-full max-h-full overflow-hidden">`, with scrollable content below the header
5. **Mobile support** -- `PageHeader` auto-adds a `SidebarTrigger` on mobile. No extra work needed.

## When to use me

Use this skill when:
- Adding a `PageHeader` to a new admin page
- Modifying the identity zone (changing icon, title, adding breadcrumbs)
- Adding or modifying toolbar content (filters, view controls, action buttons)
- Wiring the board's toolbar controls into a task list page (single-org or cross-org)
- Troubleshooting layout issues with the header (height, sticky, z-index)
- Understanding the cross-org (`/home`) vs single-org (org tasks page) pattern

## What I need from you

Tell me:
1. **Which page** -- New page or existing? Which route?
2. **Identity content** -- Simple icon+title, or custom breadcrumbs?
3. **Actions** -- Any right-side buttons/badges in the identity zone?
4. **Toolbar** -- Needed? What goes in left vs right?
5. **Task list** -- Does this page render the board? Single-org (`organizationScope`) or cross-org?
