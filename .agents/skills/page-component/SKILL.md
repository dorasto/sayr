---
name: page-component
description: Page layout component and its panel system (Page, IndentDrawer, sidebar-store) — use whenever adding a right/left panel to an admin or public page, toggling panel open state, or troubleshooting panel positioning, resizing, animation, mobile behavior, or scrolling
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

Every page that needs a floating side panel (task list "View" panel, task detail metadata panel, release detail panel, a row-click detail panel, filter panels on public pages, etc.) goes through one shared system: `Page` + `IndentDrawer` + a global `sidebar-store`. This replaced an older `PanelWrapper` component (deleted) that used `react-resizable-panels` + a `vaul` mobile `Sheet` — if you see a reference to `PanelWrapper`, `panelDefaultSize`, `panelMinSize`, `isProjectPanelOpen`, or `setProjectPanelOpen` anywhere (comments, old skills, memory), it's describing the **retired** system. This skill documents what's actually there now.

The whole point of this system: standard panels render through the same portalled `IndentDrawer` — a floating card that **pushes** (not covers) the page's main content on desktop, sits as a bottom sheet on mobile, animates open/close, and supports drag-to-resize on desktop. Panels configured with `anchored: true` are the exception — they render through `Popover` instead, pinned to their trigger element (row-level quick actions), and bypass `IndentDrawer` entirely. Either way, getting a panel "for free" on a new page means using `Page`'s `panels` prop, not hand-rolling a flex/grid split.

**Mobile is not just a smaller desktop.** A panel defaults to `modal: true` below the 768px breakpoint (a real backdrop, focus trap, click-outside-to-dismiss) even though it defaults to `modal: false` on desktop, and `defaultOpen`/persisted `open: true` state is unconditionally suppressed on mobile page-load — a panel never auto-opens on a narrow screen, full stop, no matter how it got marked open. Both are deliberate fixes for a real bug: a non-modal panel that auto-opened on mobile had nowhere to push to, so it just covered the screen without a backdrop or an obvious way to dismiss it. See "Mobile behavior" below.

## Key files

| File | Purpose |
|------|---------|
| `apps/start/src/components/generic/page.tsx` | `Page` component, `PanelConfig` type, `PanelContent` (shared header/tabs/content renderer) |
| `apps/start/src/components/generic/use-page.tsx` | `usePage()`, `usePanel(panelId)`, `usePanelTrigger(panelId, triggerId)` hooks |
| `apps/start/src/lib/sidebar/sidebar-store.ts` | `sidebarStore` (TanStack Store) + `sidebarActions` — the single source of truth for every panel's open/width/content state |
| `packages/ui/src/components/doras-ui/indent-drawer.tsx` | `IndentDrawer`/`IndentDrawerRegion`/`IndentDrawerContent` — the actual portalled, resizable drawer primitive built on `@base-ui/react/drawer` |
| `packages/ui/src/hooks/use-mobile.tsx` | `useIsMobile()` — the only mobile-detection hook in use here. `Page` and `IndentDrawer` both call it directly; there's no separate synchronous variant, don't add one (see Gotchas — a naive one is fine, but it turned out to be unnecessary here) |
| `packages/ui/src/components/doras-ui/grid-board.tsx` | Unrelated to panels, but shares the same `min-h-0`-chain class of bug as `PanelContent` — see Gotchas |

### Existing panel implementations (for reference)

| File | Route | Content | Pattern demonstrated |
|------|-------|---------|---|
| `apps/start/src/components/admin/panels/tasks.tsx` | `/$orgId/tasks` | Saved views / releases / priority tabs, "Open tasks"/"Your tasks"/category tiles | Static right panel, `defaultOpen: true` |
| `apps/start/src/components/admin/panels/task.tsx` | `/$orgId/tasks/$taskShortId` | Task metadata sidebar (`TaskContentSideContent`) | Route-driven right panel |
| `apps/start/src/components/admin/panels/releases-list.tsx` | `/$orgId/releases` | Release overview tiles | Static right panel |
| `apps/start/src/components/public/panels/task.tsx` | `/orgs/$orgSlug/$shortId` (public) | "Details" sidebar — vote/status/priority/category/release/label tiles (`PublicTaskPanelHeader`/`PublicTaskPanelContent`). Both read from `usePublicTask()` (`apps/start/src/contexts/ContextPublicOrgTask.tsx`), a `PublicTaskProvider` set up by `apps/start/src/components/public/public-task-content.tsx` | "Own the live state in a provider, hand the panel a component that reads context" — same idea as the admin task panel, since the public route has no route-level task context of its own |
| `apps/start/src/components/pages/admin/inbox/index.tsx` (`InboxListPanelHeader`, inline) | `/inbox` | Left panel: notification list | Content that must be `useMemo`'d, not a fresh JSX literal — see Gotchas |
| `apps/start/src/components/settings/api-keys/` (`context.tsx`, `api-key-panel.tsx`, `user-api-keys.tsx`, `key-details.tsx`, `create-key-form.tsx`) | `/settings/api-keys` | List of API keys; clicking a row opens its detail (scopes, usage, regenerate/revoke) in the same panel a "Create key" tile also opens | **Row-selection-driven panel via a dedicated context**, not `togglePanel` directly — see "Row-click detail panel" below. Also the reference for a dynamic per-selection header (`sidebarActions.setPanelHeader`, not a static `PanelHeaderConfig`) and a CRUD panel (`persistOpenState: false`) |

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

`header` here can be a plain `ReactNode` (as above) **or** a `PanelHeaderConfig` object (`{ title, icon }`) — only the object form gets `Page`'s native `h-11` header bar with its built-in close button. A raw node is treated as a headerless fallback: it renders, but with no close button at all. If you want the built-in close button (you almost always do), pass the object form and drive its title dynamically via `sidebarActions.setPanelHeader` from wherever the selection changes — see "Row-click detail panel" below.

### `PanelConfig` fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | required | Unique panel id — also the `sidebarStore` key |
| `header` | `ReactNode \| PanelHeaderConfig` | — | See the note above — use the object form to get the native close button |
| `tabs` | `PanelTabConfig[]` | — | `{ id, label, icon?, content }[]` — when set, renders a tab bar instead of a plain header |
| `defaultTab` | `string` | first tab | Initial active tab id |
| `defaultOpen` | `boolean` | `false` | Initial open state on first-ever mount — desktop only. **Never actually opens a panel on mobile**, regardless of this value or any persisted `open: true` from a previous wider-viewport visit — see "Mobile behavior" |
| `persistOpenState` | `boolean` | `true` | Set `false` for CRUD-style panels that should always reset to `defaultOpen`, ignoring the persisted value |
| `width` | `string` | `"380px"` | Desktop drawer/push width. **Use a fixed px value, not a percentage** — see Gotchas |
| `height` | `string` | `"38dvh"` | Mobile drawer max-height / vertical push amount |
| `mobileZoom` | `number` | — | Opt-in: also shrinks pushed content by this factor on mobile (`0.85` etc.) via CSS `zoom`, on top of the vertical push |
| `modal` | `boolean` | `false` on desktop, **`true` on mobile** | Dimming backdrop, focus trap, blocked background interaction. Leave unset to get the breakpoint-aware default; set explicitly to force one or the other regardless of viewport — see "Mobile behavior" |
| `anchored` | `boolean` | `false` | Renders as a small popover pinned to its trigger element instead of a side drawer (see `usePanelTrigger`) |
| `resizable` | `boolean` | `true` | Desktop-only drag-to-resize on the panel's near edge. Ignored for anchored panels and always off on mobile regardless of this flag |
| `minWidth` / `maxWidth` | `number` | `280` / `720` | Resize clamp, in px |

Every panel is resizable by default — you don't need to opt in. Users drag the handle on the panel's near edge; the resized width persists per-panel to `localStorage` (same mechanism as open/closed state) and survives reloads, overriding `width` until the user resizes again.

## Mobile behavior

Two breakpoint-aware defaults, both automatic — you don't opt into either, only out:

- **A panel never auto-opens on mobile.** `defaultOpen: true`, and separately, `open: true` persisted to `localStorage` from an earlier wider-viewport visit, are both force-closed the instant `Page` detects a mobile viewport (`useIsMobile()`). This is unconditional and has no per-panel escape hatch — there's no config to keep a panel auto-open on mobile, by design: a route saying "show this panel by default" is a desktop-space judgment call that doesn't apply once there's no room to push into.
- **`modal` defaults to `true` on mobile, `false` on desktop** (`panels.right.modal ?? isMobile`, same for `left`). This *does* have a per-panel escape hatch: set `modal` explicitly on the `PanelConfig` and it wins on every breakpoint. Without an explicit value, a non-modal panel on a narrow screen pushes content that has nowhere left to go, so it ends up covering the screen anyway — just without a backdrop, focus trap, or click-outside-to-dismiss, reading as a broken overlay instead of an obvious dialog. Defaulting to modal there fixes that without touching any route.

Both live in `Page` itself (`apps/start/src/components/generic/page.tsx`) — nothing to wire up per route.

## Hooks

```tsx
import { usePage, usePanel, usePanelTrigger } from "@/components/generic/use-page";
```

- **`usePage()`** → `{ openPanel(panelId, content?, options?), closePanel(panelId), togglePanel(panelId, content?, triggerId?, options?), setPanelContent(panelId, content, triggerId?), setPanelHeader(panelId, headerConfig), setActiveTab(panelId, tabId) }`. `options` is `{ header?: PanelHeaderConfig, defaultTab?: string, tabs?: PanelTabConfig[] }` on every method that takes it. Call `setPanelContent` in a `useEffect` gated on `panel.isRegistered` (see below) — a plain `[]`-effect races `Page`'s client-only registration pass and silently no-ops.
- **`usePanel(panelId)`** → `{ isRegistered, isOpen, content, header, anchored, width, lastTriggerId, activeTab, tabs }`. **There is no `toggle()` method** — drive open/close via `sidebarActions`/`usePage()`'s methods below, not off this hook. `isRegistered` becomes `true` once `Page` has registered that panel id in the store — always check it before calling `setPanelContent` from a mount effect.
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

## Row-click detail panel

The canonical shape for "click a row, a panel opens showing that row's detail; click a different row, the panel's content swaps without closing; click the same (already-selected) row again, it closes" — this is what `usePage().togglePanel` is for:

```tsx
const { togglePanel } = usePage();

<Tile onClick={() => togglePanel(
  DETAIL_PANEL_ID,
  <ApiKeyDetail apiKeyId={apiKey.id} />,
  apiKey.id,                                  // triggerId — identifies THIS row
  { header: { title: apiKey.name || "Untitled key", icon: <IconKey className="size-4" /> } }
)} />
```

Internally: same trigger while open → animated close; different trigger while open → instant content swap (no close/reopen flash), because `PanelContent` keys its content div on `lastTriggerId` to force a remount. Each panel slot has its own independent drawer, so opening one panel never needs to force-close another.

**Two ways to track which row is selected**, pick based on how many places need to know:

1. **Just `togglePanel` + `usePanel(id).lastTriggerId`**, if only the row list itself needs to know which row is "active" (e.g. for a highlight class). Compare `panel.lastTriggerId === row.id`.
2. **A dedicated context provider**, if you need the same selection state in more places, a dynamic header that reacts to more than just the trigger id (e.g. a fetched name), or CRUD actions (create/regenerate/revoke) that also need to reopen the panel to a specific state afterward. See `apps/start/src/components/settings/api-keys/context.tsx` for a full worked example: it wraps `sidebarActions.setOpen`/`setPanelContent`/`setPanelHeader` directly (not `togglePanel` — it needs finer control over the header, driven by a lookup against live data, not just the trigger id) behind a small `ApiKeysProvider`, and separately subscribes to the panel's *real* open state via `usePanel(id).isOpen` in a `useEffect` to reset its own "what's selected" state — necessary because the panel's native header close button (or a swipe-dismiss) can close the drawer through a path the provider's own click handlers never see. If you roll your own open/close wiring instead of `togglePanel`, you need this same effect, or your selection UI will drift from the drawer's actual open state.

## `sidebarActions` (imperative store API)

```tsx
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
```

Most panel work goes through `usePage`/`usePanel` above; reach for `sidebarActions` directly when you need to drive panel state from outside the panel's own render tree (e.g. a toolbar button on the page, not inside the panel — or a context provider like the API-keys one above):

| Action | Use for |
|---|---|
| `sidebarActions.setOpen(id, open)` | Toggle a panel open/closed — **not settle-guarded**, see the note below |
| `sidebarActions.close(id)` | Close, animating out — prefer this over `setOpen(id, false)` for any user-facing close action |
| `sidebarActions.setPanelHeader(id, headerConfig)` | Set/replace the dynamic header (title/icon/actions) — this is what a route-external selection change (a row click) should call, not the static `PanelConfig.header` fallback |
| `sidebarActions.setResizedWidth(id, px)` | Drive resize programmatically (rare — the resize handle already does this) |
| `sidebarActions.setPanelContent` / `setPanelHeader` | Same as the `usePage()` versions, for use outside a component that has that hook in scope |
| `sidebarActions.registerSidebar` / `syncPanelConfig` | Internal — `Page` calls these on mount/config-change, you shouldn't need to |

**Why `close(id)` and not `setOpen(id, false)` for a user-facing close**, precisely: Base UI's Drawer won't play its exit transition for a close requested before its own *open* transition has settled — confirmed empirically, not documented anywhere: closing within roughly the first 20-40ms after opening removes the popup instantly, no ending-style phase at all; past that window it always animates correctly. (This affects the imperative `actionsRef.close()` path and a plain controlled `open={false}` prop change identically — it is **not**, as an earlier version of this codebase's own comments claimed, specific to one mechanism over the other.) `Page` registers a handle per panel id that gates the close on Base UI's own `onOpenChangeComplete(true)` signal — queuing a too-early close and replaying it once the open transition genuinely finishes, instead of guessing a delay. `sidebarActions.close(id)` routes through that registered handle; `sidebarActions.setOpen(id, false)` bypasses it entirely and will still exhibit the instant-close bug if called soon enough after an open. This is handled for you as long as you go through `Page`/`sidebarActions.close`/`usePage().closePanel`/`togglePanel`'s own close branch — you'd only need to think about it again if you called Base UI's `actionsRef` directly instead.

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

1. **Use `Page`'s `panels` prop, don't hand-roll a flex/grid split** — every panel gets the shared floating-card treatment, push animation, resize, and the mobile defaults above for free this way.
2. **Panel components read from context, not props** — pass them to `setPanelContent` once; they should re-render themselves from route-level hooks, not rely on the parent re-calling `setPanelContent`.
3. **Gate `setPanelContent` on `panel.isRegistered`**, not a plain mount effect.
4. **Prefer `sidebarActions.close(id)` (or `usePage().closePanel`/`togglePanel`) over `setOpen(id, false)`** for anything user-facing — it's the one that's guarded against the just-opened race, see above.
5. **`width` should be a fixed px string, not a percentage** — see Gotchas.
6. **If you roll your own open/close wiring instead of `togglePanel`** (e.g. a context provider driving `sidebarActions` directly), also subscribe to `usePanel(id).isOpen` and reset your own selection state when it goes false — the native header close button and swipe-dismiss both close the drawer through paths your own click handlers never see.
7. **Don't add another independently-scrollable wrapper anywhere inside a panel's content tree.** `PanelContent` already splits into a `shrink-0` header and its own `flex-1 overflow-y-auto` region specifically so the header stays pinned while only the content below it scrolls; `IndentDrawerContent`'s own outer container is deliberately `overflow-hidden`, not scrollable, to enforce that there's exactly one scroll region. A second one anywhere in between reintroduces the header-scrolls-away bug (or worse — see Gotchas).
8. **Don't add `bg-card`/solid fill to content sitting next to a panel** unless you mean it — the established look for the tasks list is an unfilled bordered/margined region so group headers (`bg-muted`) stay the visual anchor; see `apps/start/src/components/pages/admin/orgid/tasks/index.tsx` for the pattern.
9. **Anchored panels skip the drawer entirely** — don't try to combine `anchored: true` with `usePanel`'s `isOpen` for positioning logic, use `usePanelTrigger`.

## Gotchas

- **Percentage `width` values create a visible inconsistency.** The push-margin (on the pushed main content) and the drawer's own rendered width are both driven by the same `--indent-drawer-width` CSS var, but they resolve percentages against *different* boxes (the margin resolves against the unpadded region width; the drawer's own width resolves against its Viewport's *padded* content box). With a fixed px value both resolve identically and the gap is always consistent; with a percentage the gap grows with the percentage value. This is exactly why every panel now defaults to `resizable: true` — resize drives a live px value, which sidesteps the mismatch entirely. If you're tempted to make a panel width responsive, resize (not a CSS percentage) is the supported way to do it.
- **`h-full` vs `flex-1` when wrapping `Page`'s children.** `Page`'s own content wrapper (`min-h-0 flex-1 overflow-y-auto`) is a plain block div, not a flex container. If your page content adds its own outer wrapper div, give it `h-full` (percentage height — works fine against a non-flex parent as long as that parent's own height is definite), not `flex-1` (which does nothing outside an actual flex container and silently collapses to content height — reproduced live: a kanban board stopped ~140px short of the real bottom of its panel).
- **A missing `min-h-0` anywhere in the height chain silently breaks scrolling, not just cosmetics — reproduced live, twice.** `PanelContent`'s content is a flex column: `shrink-0` header, then a `flex-1 overflow-y-auto` content div meant to be the sole scroll region within the drawer's bounded height. Every flex ancestor between the height-constrained `Popup` (capped at `max-md:max-h-(--indent-drawer-height)` on mobile) and that content div needs `min-h-0`, or the *first* ancestor missing it defaults to `min-height: auto` and grows to fit its full content instead of respecting the bounded height above it — and that growth silently defeats the inner `overflow-y-auto` below it, since there's nothing left for it to overflow against. Concretely: `IndentDrawerContent`'s `DrawerPrimitive.Content` used to be independently `overflow-y-auto` (redundant with `PanelContent`'s own inner scroll div), which happened to *mask* a missing `min-h-0` on `PanelContent`'s own root by giving that outer container its own scrollbar instead — the actual header-scrolls-away bug. Removing that outer scroll (correctly — see Rule 7) without fixing the `min-h-0` gap turned it into "can't scroll at all, content past the visible area is unreachable" — worse than the original bug. Both are fixed now (`PanelContent`'s root div carries `min-h-0`, `IndentDrawerContent`'s outer wrapper is `overflow-hidden`), but if you're touching either file again: change one without checking the other's assumptions and you'll reintroduce one bug or the other.
- **Kanban/grid-board full-height columns**: `GridBoardDroppableCell` (`packages/ui/src/components/doras-ui/grid-board.tsx`) intentionally uses `min-h-0` + default flex `align-items: stretch` instead of `h-full` for the same class of reason as above — `height: 100%` doesn't reliably resolve against a flex-grow-derived row height in every nesting it renders inside. Don't "fix" this back to `h-full` if you see it; it was a real, reproduced bug.
- **Resize handle needs `stopPropagation()`.** The drawer Popup has its own swipe-to-dismiss pointer tracking (from `IndentDrawer`'s `swipeDirection`). If you're touching `indent-drawer.tsx`'s resize handle, both `pointerdown` and the document-level `pointermove`/`pointerup` listeners must call `stopPropagation()` (and register in the capture phase) or a drag gets double-processed by both the resize logic and the swipe gesture, overshooting the actual pointer movement.
- **A component deriving a `useMemo`/`useEffect` dependency from a hook's `data ?? []` fallback** can cascade into "Maximum update depth exceeded" if that effect also writes to a store the same component subscribes to — the `?? []` produces a fresh array reference every render. Hoist a shared empty-array constant instead of a fresh literal (see `packages/ui/src/hooks/useStateManagement.ts`'s `EMPTY_ARRAY`).
- **Same failure mode, JSX version**: if a panel's content depends on live state (so you're calling `setPanelContent` in a `useEffect` with real deps, not just once — see the Inbox panel above), don't put an inline, unmemoized JSX literal straight into that effect's dependency array. A plain `const content = <div>...</div>` is a new object every render, so `[panel.isRegistered, setPanelContent, content]` re-fires the effect every render — `setPanelContent` writes to `sidebarStore`, the component re-renders, `content` is a new reference again, forever. Reproduced live on the Inbox panel. Wrap the JSX in `useMemo(() => (...), [theActualPrimitiveDeps])` and depend on that instead.
- **Don't add a synchronous mobile-detection helper to work around `useIsMobile()`'s one-render-late state.** It's tempting when gating a one-shot effect (registration, first-open) on mobile-vs-desktop, since `useIsMobile()` starts `false` and only becomes accurate a render after its own internal effect resolves. The actual fix used here isn't a synchronous helper — it's a *separate*, non-one-shot effect that reacts to `isMobile` itself (see "Mobile behavior"), which naturally re-fires correctly once `useIsMobile()`'s state catches up. If you're reaching for `window.innerWidth` directly to dodge this, reconsider whether the logic can be restructured as a reactive effect instead.

## When to use me

Use this skill when:
- Adding a right/left panel to a new page
- Wiring a row-click-opens-detail-panel pattern (`togglePanel`, or a dedicated context — see "Row-click detail panel")
- Toggling panel open/close state from a button
- Making panel content resizable-aware (it already is by default — just don't fight it with a percentage width)
- Troubleshooting panel positioning, push-margin gaps, animation, or mobile modal/auto-open behavior
- Debugging a panel (or a kanban/grid board) that isn't scrolling correctly or isn't filling available height
- You encounter a reference to `PanelWrapper`/`panelDefaultSize`/`isProjectPanelOpen` and need to know what replaced it (this file)

## What I need from you

Tell me:
1. **Which page** — new page or existing? Which route?
2. **Panel side** — left or right?
3. **Panel content** — what should appear in the panel?
4. **Default state** — open by default on desktop, or user-toggled? (Remember: never auto-open on mobile regardless of this.)
5. **Anchored, drawer, or row-click detail** — a small trigger-anchored popover, a full side panel, or a panel whose content changes per selected row?
