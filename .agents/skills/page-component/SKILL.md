---
name: page-component
description: Page layout component and its panel system (Page, IndentDrawer, sidebar-store) — use whenever adding a right/left panel to an admin or public page, toggling panel open state, or troubleshooting panel positioning, resizing, or animation
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

Every page that needs a floating side panel (task list "View" panel, task detail metadata panel, release detail panel, filter panels on public pages, etc.) goes through one shared system: `Page` + `IndentDrawer` + a global `sidebar-store`. This replaced an older `PanelWrapper` component (deleted) that used `react-resizable-panels` + a `vaul` mobile `Sheet` — if you see a reference to `PanelWrapper`, `panelDefaultSize`, `panelMinSize`, `isProjectPanelOpen`, or `setProjectPanelOpen` anywhere (comments, old skills, memory), it's describing the **retired** system. This skill documents what's actually there now.

The whole point of this system: standard panels render through the same non-modal, portalled `IndentDrawer` — a floating card that **pushes** (not covers) the page's main content when it opens, animates open/close, and (as of this session) supports drag-to-resize on desktop. Panels configured with `anchored: true` are the exception — they render through `Popover` instead, pinned to their trigger element (row-level quick actions), and bypass `IndentDrawer` entirely. Either way, getting a panel "for free" on a new page means using `Page`'s `panels` prop, not hand-rolling a flex/grid split.

## Key files

| File | Purpose |
|------|---------|
| `apps/start/src/components/generic/page.tsx` | `Page` component, `PanelConfig` type, `PanelContent` (shared header/tabs/content renderer) |
| `apps/start/src/components/generic/use-page.tsx` | `usePage()`, `usePanel(panelId)`, `usePanelTrigger(panelId, triggerId)` hooks |
| `apps/start/src/lib/sidebar/sidebar-store.ts` | `sidebarStore` (TanStack Store) + `sidebarActions` — the single source of truth for every panel's open/width/content state |
| `packages/ui/src/components/doras-ui/indent-drawer.tsx` | `IndentDrawer`/`IndentDrawerRegion`/`IndentDrawerContent` — the actual non-modal, portalled, resizable drawer primitive built on `@base-ui/react/drawer` |
| `packages/ui/src/components/doras-ui/grid-board.tsx` | Unrelated to panels, but shares the "reproduced live, fixed with min-h-0 + default stretch" flex-height class of bug — see Gotchas |

### Existing panel implementations (for reference)

| File | Route | Content |
|------|-------|---------|
| `apps/start/src/components/admin/panels/tasks.tsx` | `/$orgId/tasks` | Saved views / releases / priority tabs, "Open tasks"/"Your tasks"/category tiles |
| `apps/start/src/components/admin/panels/task.tsx` | `/$orgId/tasks/$taskShortId` | Task metadata sidebar (`TaskContentSideContent`) |
| `apps/start/src/components/admin/panels/releases-list.tsx` | `/$orgId/releases` | Release overview tiles |

## `Page` component API

```tsx
import { Page } from "@/components/generic/page";

<Page
  header={header}          // ReactNode, rendered via PageHeader — see the page-header skill
  toolbar={toolbar}        // optional, rendered as its own h-11 border-b row below header
  panels={{
    right: { id: "my-panel", header: <MyPanelHeader />, defaultOpen: true, width: "420px" },
    // left: {...} also supported, same shape
  }}
  className="h-full"       // optional
>
  {/* main page content — Page provides its own scroll container around this */}
</Page>
```

### `PanelConfig` fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | required | Unique panel id — also the `sidebarStore` key |
| `header` | `ReactNode \| PanelHeaderConfig` | — | `PanelHeaderConfig = { title?, icon?, actions?, showClose? }` — a fallback rendered when no dynamic header has been set via `usePage().setPanelHeader` |
| `tabs` | `PanelTabConfig[]` | — | `{ id, label, icon?, content }[]` — when set, renders a tab bar instead of a plain header |
| `defaultTab` | `string` | first tab | Initial active tab id |
| `defaultOpen` | `boolean` | `false` | Initial open state on first-ever mount only |
| `persistOpenState` | `boolean` | `true` | Set `false` for CRUD-style panels that should always reset to `defaultOpen`, ignoring the persisted value |
| `width` | `string` | `"380px"` | Desktop drawer/push width. **Use a fixed px value, not a percentage** — see Gotchas |
| `height` | `string` | `"38dvh"` | Mobile drawer max-height / vertical push amount |
| `mobileZoom` | `number` | — | Opt-in: also shrinks pushed content by this factor on mobile (`0.85` etc.) via CSS `zoom`, on top of the vertical push |
| `anchored` | `boolean` | `false` | Renders as a small popover pinned to its trigger element instead of a side drawer (see `usePanelTrigger`) |
| `resizable` | `boolean` | `true` | Desktop-only drag-to-resize on the panel's near edge. Ignored for anchored panels and always off on mobile regardless of this flag |
| `minWidth` / `maxWidth` | `number` | `280` / `720` | Resize clamp, in px |

Every panel is resizable by default now — you don't need to opt in. Users drag the handle on the panel's near edge; the resized width persists per-panel to `localStorage` (same mechanism as open/closed state) and survives reloads, overriding `width` until the user resizes again.

## Hooks

```tsx
import { usePage, usePanel, usePanelTrigger } from "@/components/generic/use-page";
```

- **`usePage()`** → `{ setPanelContent(panelId, node, triggerId?), setPanelHeader(panelId, headerConfig), closePanel(panelId), openPanel(panelId) }`. Call `setPanelContent` in a `useEffect` gated on `panel.isRegistered` (see below) — a plain `[]`-effect races `Page`'s client-only registration pass and silently no-ops.
- **`usePanel(panelId)`** → `{ isOpen, isRegistered, toggle() }`. `isRegistered` becomes `true` once `Page` has registered that panel id in the store — always check it before calling `setPanelContent`.
- **`usePanelTrigger(panelId, triggerId)`** → for **anchored** panels only: renders the panel content inside a `Popover` anchored to whatever element you attach the returned trigger props to, instead of a side drawer.

```tsx
const { setPanelContent } = usePage();
const panel = usePanel(MY_PANEL_ID);

useEffect(() => {
  if (!panel.isRegistered) return;
  setPanelContent(MY_PANEL_ID, <MyPanelContent />);
}, [panel.isRegistered, setPanelContent]);
```

`MyPanelContent` pulls everything it needs from context itself (route-level providers), so it only needs to be handed to the panel once — it stays in sync on its own as long as it reads live context/hooks rather than being passed stale props.

## `sidebarActions` (imperative store API)

```tsx
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
```

Most panel work goes through `usePage`/`usePanel` above; reach for `sidebarActions` directly when you need to drive panel state from outside the panel's own render tree (e.g. a toolbar button on the page, not inside the panel):

| Action | Use for |
|---|---|
| `sidebarActions.setOpen(id, open)` | Toggle a panel open/closed |
| `sidebarActions.close(id)` | Close, animating out (prefer over `setOpen(id, false)` for user-facing close actions — plays the exit animation) |
| `sidebarActions.setResizedWidth(id, px)` | Drive resize programmatically (rare — the resize handle already does this) |
| `sidebarActions.setPanelContent` / `setPanelHeader` | Same as the `usePage()` versions, for use outside a component that has that hook in scope |
| `sidebarActions.registerSidebar` / `syncPanelConfig` | Internal — `Page` calls these on mount/config-change, you shouldn't need to |

## Toggle button pattern

```tsx
const panel = usePanel(MY_PANEL_ID);

<Button
  variant="accent"
  className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1", !panel.isOpen && "bg-transparent")}
  onClick={() => (panel.isOpen ? sidebarActions.close(MY_PANEL_ID) : sidebarActions.setOpen(MY_PANEL_ID, true))}
>
  {panel.isOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
</Button>
```

## Anchored (popover) panels

For small, row-level quick actions (a table row's settings gear) where a full side drawer is the wrong shape, set `anchored: true` on the `PanelConfig` and use `usePanelTrigger` instead of relying on `Page`'s drawer rendering — anchored panels render entirely at the trigger's own call site via a `Popover`, and `Page` skips them when building the drawer.

## Rules

1. **Use `Page`'s `panels` prop, don't hand-roll a flex/grid split** — every panel gets the shared floating-card treatment, push animation, and resize for free this way.
2. **Panel components read from context, not props** — pass them to `setPanelContent` once; they should re-render themselves from route-level hooks, not rely on the parent re-calling `setPanelContent`.
3. **Gate `setPanelContent` on `panel.isRegistered`**, not a plain mount effect.
4. **Prefer `sidebarActions.close(id)` over `setOpen(id, false)`** for anything user-facing — it plays the exit animation.
5. **`width` should be a fixed px string, not a percentage** — see Gotchas.
6. **Don't add `bg-card`/solid fill to content sitting next to a panel** unless you mean it — the established look for the tasks list is an unfilled bordered/margined region so group headers (`bg-muted`) stay the visual anchor; see `apps/start/src/components/pages/admin/orgid/tasks/index.tsx` for the pattern.
7. **Anchored panels skip the drawer entirely** — don't try to combine `anchored: true` with `usePanel`'s `isOpen` for positioning logic, use `usePanelTrigger`.

## Gotchas

- **Percentage `width` values create a visible inconsistency.** The push-margin (on the pushed main content) and the drawer's own rendered width are both driven by the same `--indent-drawer-width` CSS var, but they resolve percentages against *different* boxes (the margin resolves against the unpadded region width; the drawer's own width resolves against its Viewport's *padded* content box). With a fixed px value both resolve identically and the gap is always consistent; with a percentage the gap grows with the percentage value. This is exactly why every panel now defaults to `resizable: true` — resize drives a live px value, which sidesteps the mismatch entirely. If you're tempted to make a panel width responsive, resize (not a CSS percentage) is the supported way to do it.
- **`h-full` vs `flex-1` when wrapping `Page`'s children.** `Page`'s own content wrapper (`min-h-0 flex-1 overflow-y-auto`) is a plain block div, not a flex container. If your page content adds its own outer wrapper div, give it `h-full` (percentage height — works fine against a non-flex parent as long as that parent's own height is definite), not `flex-1` (which does nothing outside an actual flex container and silently collapses to content height — reproduced live: a kanban board stopped ~140px short of the real bottom of its panel).
- **Kanban/grid-board full-height columns**: `GridBoardDroppableCell` (`packages/ui/src/components/doras-ui/grid-board.tsx`) intentionally uses `min-h-0` + default flex `align-items: stretch` instead of `h-full` for the same class of reason — `height: 100%` doesn't reliably resolve against a flex-grow-derived row height in every nesting it renders inside. Don't "fix" this back to `h-full` if you see it; it was a real, reproduced bug.
- **Resize handle needs `stopPropagation()`.** The drawer Popup has its own swipe-to-dismiss pointer tracking (from `IndentDrawer`'s `swipeDirection`). If you're touching `indent-drawer.tsx`'s resize handle, both `pointerdown` and the document-level `pointermove`/`pointerup` listeners must call `stopPropagation()` (and register in the capture phase) or a drag gets double-processed by both the resize logic and the swipe gesture, overshooting the actual pointer movement.
- **A component deriving a `useMemo`/`useEffect` dependency from a hook's `data ?? []` fallback** can cascade into "Maximum update depth exceeded" if that effect also writes to a store the same component subscribes to — the `?? []` produces a fresh array reference every render. Hoist a shared empty-array constant instead of a fresh literal (see `packages/ui/src/hooks/useStateManagement.ts`'s `EMPTY_ARRAY`).

## When to use me

Use this skill when:
- Adding a right/left panel to a new page
- Toggling panel open/close state from a button
- Making panel content resizable-aware (it already is by default — just don't fight it with a percentage width)
- Troubleshooting panel positioning, push-margin gaps, or animation
- Debugging a kanban/grid board that isn't filling available height
- You encounter a reference to `PanelWrapper`/`panelDefaultSize`/`isProjectPanelOpen` and need to know what replaced it (this file)

## What I need from you

Tell me:
1. **Which page** — new page or existing? Which route?
2. **Panel side** — left or right?
3. **Panel content** — what should appear in the panel?
4. **Default state** — open by default, or user-toggled?
5. **Anchored or drawer** — a full side panel, or a small trigger-anchored popover?
