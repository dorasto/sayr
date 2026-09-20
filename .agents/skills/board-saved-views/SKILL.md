---
name: board-saved-views
description: Personal (cross-org) saved views on the board — the global store, the breadcrumb view switcher / panel header / Favourites sidebar and what each owns, dirty-state detection/reset/update, and the shared useActiveView hook — use whenever touching personal-views-store, active-view-switcher, active-view-panel-header, use-active-view, save/edit-view popovers, or favourites-section.tsx
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

A personal saved view is a `saved_view` row with `organizationId: null` — a snapshot of `filterParams` + `viewConfig` (grouping/sort/view-mode/icon/color) scoped to the signed-in user, not an org. They power three separate pieces of UI, each with a **deliberately different job** — the recurring mistake this skill exists to prevent is assuming they're redundant and merging their responsibilities (or rebuilding a fourth view list: an earlier `PresetSwitcher` did exactly that, duplicated pin/edit/delete with the breadcrumb, drifted, and was removed):

| UI | File | Owns |
|---|---|---|
| Breadcrumb switcher | `saved-views/active-view-switcher.tsx` (`ActiveViewSwitcher`) | The one place views are **managed**: select, dirty-aware Reset / Save changes on the active row, **edit** (`EditViewPopover` — rename + icon/color), **delete**, and "Save view" / "Save as new view" (`SaveViewPopover`) when the live state is dirty. Row actions are hover-revealed. |
| Panel header | `saved-views/active-view-panel-header.tsx` (`ActiveViewPanelHeader`, `ActiveViewPanelPinButton`) | The active view's icon (via `ViewIconColorTrigger`) + a borderless inline-editable name that saves on blur, and the **pin/unpin** toggle — the one action the switcher deliberately doesn't own. Wired through `Page`'s `panels.right.header` (`icon` / `actions`, `showClose: false`). |
| Sidebar shortcuts | `admin/sidebars/favourites-section.tsx` (`FavouritesSection`) | Pinned views only, rendered on **every** admin page (not just `/home`), navigate-to-and-apply, drag-to-reorder + unpin. |

`saved-views/use-active-view.ts` (`useActiveView()`) is the shared lookup + dirty predicate — `{ activeView, isDirtyFromActiveView, isDirty }` — used by the switcher, the panel header, and the Cmd+K "Save current view" command so they can't disagree. Don't re-derive `personalViews.find((v) => (v.slug || v.id) === viewSlug)` inline.

All of them read the same global `personal-views-store.ts` — there's exactly one source of truth, not per-component fetches, specifically because the Favourites sidebar needs the list on pages that never mount `/home`'s own data-loading context.

## The store

`apps/start/src/lib/stores/personal-views-store.ts` — a plain `Store<{ views: schema.savedViewType[]; loaded: boolean }>` from `@tanstack/react-store`. Actions: `hydrate`, `refresh`, `create`, `updateView`, `remove`, `togglePin`, `reorder`. Every mutating action (`updateView`/`remove`/`togglePin`/`reorder`) follows the same optimistic-then-rollback shape: snapshot `previous = store.state.views`, `setState` optimistically, call the server action, on error `setState(() => ({ ...state, views: previous }))` and re-throw. `sortViews()` (pinned-first, then by `position`) runs after every mutation and matches `getPersonalViews`' own DB ordering.

**Two different population paths, by design, not an oversight:**
- `/home`'s route loader already has `personalViews` as part of `getLanderData`'s single round-trip, so `HomeLayout` calls `personalViewsActions.hydrate(personalViews)` directly — zero-flash, no extra fetch, and `personalViews` is deliberately **not** threaded into `ContextLander`/`useLanderData()` (it has no field for it) precisely so there's only one place (the store) that can hold it.
- Every other admin page relies on `RootProvider`'s (`admin/shell/context.tsx`) mount-once `personalViewsActions.refresh()` effect (same pattern as `notificationActions.refresh()`, right next to it) — the Favourites sidebar's actual data source when you're not on `/home`.

`updateView`'s `updates` type is `Partial<{ name, viewConfig, filterParams }>` — `filterParams: string` flows all the way through to `updatePersonalView` in `packages/database/src/functions/savedView.ts` unchanged. This is what the breadcrumb switcher's inline "Save changes" button uses to persist current local filters back into an existing row (see below) — it's not a rename-only API despite `EditViewPopover` only ever passing `name`/`viewConfig`.

`apps/start/src/components/board/saved-views/use-personal-views.ts` is a thin `useStore` + `useCallback` adapter over the actions above — every consumer goes through this, not the store directly.

## Dirty-state detection (`use-board-view-state.ts`)

The URL's `?view=<id>` stays constant even after the user tweaks filters/grouping locally — there was no way to tell "what I'm looking at differs from what's saved" until this session added it. The mechanism, all in `apps/start/src/components/board/filter/use-board-view-state.ts`:

- `getViewCombinedState(view)` — resolves a saved view row (`deserializeFilters(view.filterParams)` + `mapViewConfigToState(view.viewConfig)`) into the same `{ filters, viewConfig }` shape as live state. Exported and reused by both the URL auto-load effect and `selectView` — don't reintroduce a third inline copy of this mapping.
- `areStatesEqual(a, b)` — exported pure comparison (serializes filters, field-compares viewConfig).
- `mapStateToViewConfig(viewConfig, iconColor)` — the inverse of `mapViewConfigToState`, needed to persist local `TaskViewState` back into the schema `viewConfig` shape (icon/color have to be threaded in separately since they're not part of `TaskViewState`).
- `resetToSavedView(view)` — **same body as `selectView`, minus its `viewSlug === targetViewSlug` early-return guard.** `selectView`'s guard exists to skip redundant no-op navigations when picking a view from a list; that guard is exactly wrong for "revert local changes back to what's saved," since the dirty case is *by definition* already on that view's slug. If you need a third "force-apply a view" entry point, don't reuse `selectView` — it will silently no-op.

`useActiveView()` (`saved-views/use-active-view.ts`) computes dirtiness two ways: `isDirtyFromActiveView` (a view is selected and the live `{ filters, viewConfig }` differ from `getViewCombinedState(activeView)`) and `isDirtyFromBlank` (no view selected — "All tasks" — and the live state differs from `DEFAULT_COMBINED_STATE`, i.e. "worth offering to save"); `isDirty` is either. `ActiveViewSwitcher` shows a small dot next to the name whenever `isDirty`. On the active row, when `isDirtyFromActiveView`, the checkmark is swapped for inline Reset (`resetToSavedView`) and Save changes (`usePersonalViews().updateView` with `serializeFilters(filters)` + `mapStateToViewConfig(viewConfig, activeView's icon/color)`) buttons. When `isDirty`, a "Save view" (All tasks) / "Save as new view" (on a view) `SaveViewPopover` row appears at the bottom of the menu.

**`applyFilter` leaves the active view; the panel's quick-filter rows don't.** `applyFilter` (used by the Cmd+K quick-filter commands) replaces filters wholesale and passes `{ view: null, ... }` in its URL params, so running one while a view is active *leaves* the view rather than making it dirty. `QuickFilterPanel`'s rows go through `setFilters(toggleFieldValues(...))`, which leaves `?view=` alone when a view is active — so they make it dirty. To reproduce dirty-state, use those panel rows or the View-options popover (grouping/sort/show-completed — these call `setViewConfig` directly, no URL `view` param touched).

## Icon/color picker

`saved-views/view-icon-color-trigger.tsx` — a `Popover` stacking `ColorPickerCustom` (`packages/ui/.../tomui/color-picker-custom.tsx`) over `IconPicker` (`generic/icon-picker.tsx`), trigger is `RenderIcon` tinted by the chosen color. `DEFAULT_VIEW_ICON`/`DEFAULT_VIEW_COLOR` are exported from this file and reused everywhere a view might not have icon/color set yet (legacy rows, or the default "Home"/list icon in `ActiveViewSwitcher`). Storage convention: color as an HSLA string, icon as a bare Tabler component name string — matches `category`/`release`'s own schema defaults, not the old `components/tasks/**` reference's white default (invisible against this app's chrome).

`save-view-popover.tsx`/`edit-view-popover.tsx` both use `InputGroup`/`InputGroupAddon`/`InputGroupButton`/`InputGroupInput` (`packages/ui/.../input-group.tsx`) to render the icon trigger + name field + save button as one bordered unit — don't hand-roll a flex row of a raw `<input>` + separate `<button>` for this shape, `InputGroup` already exists for exactly it (this was corrected once already this session).

## Favourites sidebar

`admin/sidebars/favourites-section.tsx`, mounted in `primary.tsx` between the nav-items group and Organizations — hidden entirely when nothing's pinned. Drag-reorder works from anywhere on the row (no grip handle): `MouseSensor` with an 8px `distance` constraint and `TouchSensor` with a 250ms press-and-hold `delay`, so a plain click/tap still navigates and touch scrolling isn't hijacked. Because the row is a real `<Link>`, `FavouriteRow` also records the pointerdown position in a capture-phase handler and swallows the following click (`onClickCapture`) if the pointer moved past the same 8px — dnd-kit's own click suppression doesn't reliably reach a TanStack `<Link>` nested this deep, and without the guard, letting go of a drag navigated to whichever row you dropped on. The list is wrapped in `SidebarGroupToggle` (`sidebar-group-toggle.tsx`), a collapsible group header styled like a normal sidebar row; Organizations uses the same toggle.

**Same-route navigation bypasses the router.** `FavouriteRow`'s `<Link to="/home" search={{ view }}>` has an `onClick` that, when already on `/home`, calls `event.preventDefault()` and writes the URL directly via `useTasksSearchParams().setSearchParams` instead of letting the click go through TanStack Router. Root cause this fixes: the router's `navigate()` pipeline is async even for a same-route, search-only change (runs `beforeLoad`/loader-dedup regardless), and racing that against rapid clicks between two favourites left the URL and the actually-applied view out of sync until an unrelated re-render happened to catch up — reproduced, and **not reliably reproducible via a fixed-short-wait synthetic click-loop** (a genuine 1-2 render-cascade delay between "URL written" and "state applied" makes automated rapid-click tests noisy even when the app is correct — trust manual testing over that specific class of synthetic test here). The sidebar's "Dashboard" link (`primary.tsx`) mirrors the same bypass pattern for the opposite case — clearing the view — calling `clearSearchParams()` directly; `use-board-view-state.ts`'s URL auto-load effect has a matching `!targetSlug` branch that resets state to `DEFAULT_COMBINED_STATE` when a previously-set view slug disappears from the URL, which is what actually makes the Dashboard link reset the board (the link only changes the URL, the effect is what reacts to it).

## Rules

1. **Keep one owner per action.** Select/edit/delete/save/reset live in `ActiveViewSwitcher`; pin/unpin lives in `ActiveViewPanelPinButton` (plus the Favourites row's own unpin). Don't grow a second view-management list elsewhere — the removed `PresetSwitcher` was exactly that, and two UIs owning the same actions drifted out of sync.
2. **Any new "apply a view" entry point must decide whether it wants `selectView`'s (skip-if-already-there) or `resetToSavedView`'s (always-apply) semantics** — they look interchangeable but aren't.
3. **Mutate the store via `personal-views-store.ts` actions, never `setState` directly from a component** — the optimistic-rollback shape lives there once, not per call site.
4. **Same-route navigation for anything view/filter-related should bypass the router** (write via `useTasksSearchParams` directly), matching the Favourites/Dashboard pattern — going through a full `navigate()` reintroduces the async race described above.
5. **Never delete a personal/saved view via browser automation during testing** — leave test artifacts for a human to clean up manually (this followed a real data-loss incident: an automated multi-row delete-button lookup matched an ambiguous selector and deleted a pre-existing view instead of the intended test one).

## Gotchas

- **`ContextLander`/`useLanderData()` has no `personalViews` field** — if you're tempted to add one because a component "already has `useLanderData()` in scope," don't; go through `usePersonalViews()` instead, or you'll create a second source of truth that can drift from the store the Favourites sidebar reads.
- **`getPersonalViews`'s DB-level ordering (pinned first, then position) is duplicated client-side in `sortViews()`** — if the DB ordering ever changes, `sortViews()` needs a matching update or the store's optimistic re-sort after a mutation will disagree with what a fresh `refresh()`/reload shows.
- **`reorder` is partial-list-safe by design** — it only rewrites `position` for the ids it's given (e.g. just the pinned subset from the Favourites sidebar drag), leaving every other view's `position` untouched, then re-sorts the full array. Don't "simplify" it to rewrite every view's position unconditionally; that would silently reorder views the caller never touched.
