---
name: board
description: The reusable task board (list/kanban/card views, data source + capabilities, view/grouping registries, renderer slots, field pickers, filtering, layout) powering /home and the public portal's Feedback and Roadmap — use whenever adding/editing a board field, filter, grouping, view mode, renderer, or anything under apps/start/src/components/board/
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

`apps/start/src/components/board/` is a from-scratch, page-agnostic task board built for SAY-73's unified cross-org lander (`/home`). "From scratch" is a hard boundary, not a suggestion: **zero imports from `apps/start/src/components/tasks/**`**, the older org-scoped `UnifiedTaskView` system. Every forked file (`filter/types.ts`, `filter/operators.ts`, `filter/sort-config.ts`, `config/field-config.tsx`, `config/groupings.tsx`, etc.) says so in its own header comment, with a reason specific to that file — a differing field vocabulary (`"org"` doesn't exist in the old system), a Vite/`node:crypto` bundling constraint, or simply "the old system is retired." **This boundary is convention-only — nothing lints or builds against it.** The one deliberate exception is `core/admin-board-provider.tsx` (see "Data flow"), which imports the shared `useTaskFieldAction` hook; don't assume a future PR can't break the boundary silently.

The board is genuinely page-agnostic: `<Board />` (`board.tsx`) takes **no props** (no `tasks` prop) and reads its items from the surrounding `BoardProvider` via `useBoardData()` (`core/board-data.tsx`). It does not fetch data, and it does not render any page chrome (filter bar, view switcher, save-view button) — those live in the *page's* `PageHeader.Toolbar`, composed from the pieces below. There are three consumers:

- `/home` (`pages/admin/home/index.tsx`) — the reference admin integration: it wraps its `<Page>` in `<AdminBoardProvider>` so everything rendered by the page (toolbar, header, the portalled right panel, `<Board />`) can reach the data. Full capabilities, all registered views, saved views.
- The public Feedback board (`components/public/task-view.tsx`) — read-only, `FLAT_LIST_VIEW` only with `renderers.row` = the public post card (`components/public/task-item.tsx`, which renders `FieldStatus`/`FieldCategory`/`FieldLabel` read-only), `passthrough` data, `controlled` view state. See the `public-portal` skill.
- The public Activity list (`components/public/portal/activity/ActivityBody.tsx`) — a read-only provider with no `<Board />`, only so the same post card's `Field*` components have their context.
- The public Roadmap (`components/public/portal/roadmap/roadmap-board.tsx`, the Feedback board's `?layout=roadmap`) — read-only full-height `KANBAN_VIEW` with a page-local grouping (`ownsMembership`), `controlled` state. See the `public-portal` skill.

Anything else that wants the board mounts its own `BoardProvider`. The four things a provider decides: the **data** (`BoardDataSource`), what the viewer may **do** (`BoardCapabilities`), how view state is **held** (`BoardScope`, see `board-saved-views`), and how things **look** (`views`, `groupings`, `renderers`).

Saved/personal views (the store, the breadcrumb switcher / panel header / Favourites sidebar, dirty-state detection, scope/persistence modes) are a big enough sub-area to have their own skill — see `board-saved-views`. This skill covers everything else: data source, capabilities, views, groupings, renderers, theming, fields, filtering, layout, and command palette wiring.

## Key files

| Area | File | Purpose |
|---|---|---|
| Data source | `core/board-data.tsx`, `core/board-item.ts`, `core/board-item-actions.ts`, `core/board-users.ts` | `BoardProvider` + `useBoardData()` (throws outside a provider): `items`, `labels`, `categories`, `releases`, optional `users`/`status`/`pagination`/`passthrough`, optional `updateItems` (absent = read-only data; writers no-op), injected `useItemActions` hook. Items are typed `BoardItem {id}` / `TaskItem` (= `TaskWithLabels`); only the task entity is rendered today. `useBoardItemActions(task)`, `useBoardAssignableUsers(orgId)`, `useBoardFilterUsers()` are the shared consumer hooks. `BoardProvider` props: `data`, `capabilities` (both required), `scope`, `groupings`, `views`, `renderers` — keep object/array props stable (module-level or memoised). |
| Capabilities | `core/capabilities.ts` | `BoardCapabilities`, `ADMIN_CAPABILITIES`/`READ_ONLY_CAPABILITIES`, pure `resolveCapabilities`. See "Capabilities" below |
| Renderers | `core/renderers.ts` | `BoardRenderers {row?, card?, listContainer?, footer?, states?}` — see "Renderer slots" below |
| View-state scope | `core/scope.tsx`, `core/scope-config.ts`, `core/view-config.ts` | `BoardScope {key, persistence, initial?, controlled?}`, `useBoardScope()`, persisted-mode mapping, `pageLocalGrouping` — see `board-saved-views` |
| Admin adapter | `core/admin-board-provider.tsx` | `AdminBoardProvider` — the ONLY board file that calls `useLanderData()` and the only one importing `components/tasks` (`useTaskFieldAction`) |
| Entry point | `board.tsx` | Reads `useBoardData()`; applies filters → completed-visibility → sort (one `useMemo`) unless the data is `passthrough` / the grouping `ownsMembership` (see "Data source flags"), resolves `renderers.states`, renders the bulk bar (`canBulk`) in a fragment, delegates to `views/board-view-shell.tsx` |
| View registry | `views/view-registry.tsx` (+ pure `views/view-registry-model.ts`) | See "View registry" below |
| View dispatch | `views/board-view-shell.tsx` | Registry lookup via `useActiveBoardView()`; wraps the view in `BoardViewCapabilityScope` so a view with `supports.drag === false` narrows `canDrag` |
| List view | `views/board-list-view.tsx` | `BoardListView({tasks, flatSubtasks?})` picks `DraggableBoardList` (dnd-kit multi-container sortable list) when `canDrag`, else `StaticBoardList` (same grouping/nesting/collapse/sticky headers via the shared `useBoardListModel`, no `DndContext`/sortable/sensors/overlay/`useSortable`). Subtask nesting, sticky group headers, `renderers.row`/`listContainer`/`footer`. `grouping === "none"` = one header-less section |
| Kanban view | `views/board-kanban-view.tsx`, `views/kanban-model.ts` | `BoardKanbanView({tasks, pageScroll?})` wraps `packages/ui/.../doras-ui/grid-board.tsx` (generic, dnd-kit encapsulated inside it); `disabled={!canDrag}` turns its dnd off and the drop executor is never mounted; the footer sits inside the board's own flex column under the columns. `kanban-model.ts` is the pure column/row/grid-item derivation (tested) |
| Card view | `views/board-card-view.tsx`, `views/card-sections.ts`, `views/board-load-more.tsx` | See "Card view" below |
| Row / card | `views/board-row.tsx`, `views/board-card.tsx` | Compose the field pickers below into a list row / kanban or grid card (checkbox gated on `canSelect`) |
| Group header | `views/group-header.tsx` | Shared tinted-pill header, used by list sticky headers, card-view section headers and kanban row headers |
| Drag commit | `views/board-drag-actions.tsx` | Maps a drop to a field-update patch by calling the grouping's `getDropPatch` (primary merged with sub-grouping); a grouping without it (assignee/org/none/page-local) no-ops on drag. Writes through `useBoardItemActions` |
| Field config | `config/field-config.tsx` | `STATUS_CONFIG`/`PRIORITY_CONFIG`/`VISIBILITY_CONFIG` + `ROW_LEADING_GUTTER_CLASS`/`ORG_KEY_SLOT_CLASS` |
| Grouping registry | `config/grouping-registry.ts` (pure) + `config/groupings.tsx` | See "Grouping registry" below. `groupTasks`/`applyNestedGrouping` (+ `…AsColumns`) are facades over it; `getTopLevelTasks`/`buildSubtaskMap` are the list's subtask helpers |
| Grouping options | `config/grouping-options.tsx` | `TASK_GROUPING_OPTIONS`/`TASK_GROUPINGS` for the "Group by" menu, derived from the built-in registry (the six persistable ids; `none` and page-local ids are not offered) |
| Field pickers | `fields/field-{status,priority,assignee,label,category,release,visibility}.tsx`, `fields/field-toolbar.tsx`, `fields/static-field.tsx` | One picker per field, `FieldToolbar` composes a subset via `fields={[...]}`. With `canEditFields` off each picker renders `StaticField` (same visual, no button/popover/handlers). `FieldStatus` also takes an optional `label` that, read-only only, renders a coloured status pill (icon + text, `rounded-lg border`, colour from `STATUS_CONFIG[status].className` in `config/field-config.tsx`) instead of the bare icon — the public post card passes the public wording (`getPortalStatus(status).label`). All `Field*` components need a `BoardProvider` above them |
| Filter types | `filter/types.ts` | `FilterField`/`FilterCondition`/`FilterOption`/`FilterFieldConfig` |
| Filter engine | `filter/filter-config.tsx` | `FIELD_CONFIGS`, `applyFilters`, `evaluateCondition`/`extractFieldValue` |
| Filter UI | `filter/filter-builder.tsx`, `filter/filter-builder-condition-row.tsx` | `FilterBuilder` (the toolbar's Filter button + popover) wrapping `FilterBuilderContent` — condition list + per-condition value picker. The side panel does not render the builder. |
| Filter helpers | `filter/multi-select.ts`, `filter/serialization.ts`, `filter/operators.ts`, `filter/sort-config.ts` | Toggle/merge logic, URL round-trip, operator labels, sort fields |
| State hook | `filter/use-board-view-state.ts` | Combined filter+viewConfig state, URL sync, saved-view apply/reset — see `board-saved-views` |
| Quick filters | `quick-filters/quick-filter-config.tsx`, `quick-filters/quick-filter-panel.tsx`, `quick-filters/quick-filter-chips.tsx` | `QUICK_FILTERS` (consumed by the Cmd+K commands). `QuickFilterPanel` is the right panel's body: a tab per field, listing only values with ≥1 match given the *other* active filters, sorted by count. `quick-filter-chips.tsx` (`ToggleGroup` chips) is currently not mounted anywhere. |
| Layout | `layout/board-side-panel.tsx`, `layout/board-view-options.tsx`, `layout/task-count-label.tsx` | Right-panel body (`BoardSidePanelContent` → `QuickFilterPanel`); view picker/group-by/sort/show-completed popover; the "N tasks" toolbar label |
| Command palette | `apps/start/src/hooks/commands/useLanderCommands.tsx` | `/home`-only Cmd+K commands, mounted via `LanderCommandRegistrar` inside `RootProviderLander` |
| Live updates | `apps/start/src/lib/board/apply-lander-event.ts`, `apps/start/src/hooks/useLanderServerEventsSubscription.ts`, `apps/start/src/lib/task-created-message.ts` | Pure SSE event / window message → data reducer (+ tests), the thin subscription hook that applies it, and the "task created in this client" message — see "Live updates" below |

## Data flow

```
route loader (getLanderData)          — apps/start/src/routes/(admin)/home/route.tsx
  → RootProviderLander (ContextLander) — tasks/labels/categories/releases/permissionsByOrg; re-seeds from the loader whenever it returns new data
    → AdminHomePage                    — pages/admin/home/index.tsx
      → AdminBoardProvider             — core/admin-board-provider.tsx, the only reader of useLanderData(); builds the BoardDataSource (items = tasks, updateItems = updateTasks, useItemActions) + ADMIN_CAPABILITIES
        → <Board />                    — reads useBoardData().items
          passthrough? → items as given            (host already filtered/ordered)
          else: filters (useBoardViewState)  → applyFilters(tasks, filters)
                ownsMembership grouping? → stop here (no completed-visibility, no sort)
                showCompletedTasks           → drop done/canceled
                sortBy/sortDirection         → sortTasks(...)
          resolveBoardState(status, count, renderers.states) → state node, or:
        → <BoardViewShell tasks={visibleTasks} />
            getBoardView(viewMode, useBoardViews()) → list | kanban | card | page-local view (registry lookup; unknown → list)
              → applyNestedGrouping(tasks, grouping, subGrouping)   (grouping registry; unknown id → status)
                → renderers.row ?? BoardRow / renderers.card ?? BoardCard → FieldStatus/FieldPriority/FieldAssignee/FieldLabel/...
```

Other hosts replace the first four lines with their own `BoardProvider` (the public pages build a `BoardDataSource` from their own query hooks); everything from `<Board />` down is identical.

**Reading data: use `useBoardData()` (or the `useBoard*` hooks), never `useLanderData()`.** Only `core/admin-board-provider.tsx` may call `useLanderData()`. A board file that reaches into the lander context silently breaks every host other than `/home` (the lander provider only exists there). `useBoardData()` throws outside a `BoardProvider`.

### Data source flags

- `passthrough: true` — "`items` are final": the host already applied its own filters, completed-visibility and ordering (the public Feedback board, whose endpoint is server-sorted and paged, and where the canceled-only-under-All rule lives in the page). `Board` then skips filter, completed-visibility and sort entirely. Without it `Board` arranges the items.
- A grouping's `ownsMembership` (see "Grouping registry") is the *grouping-level* equivalent: `Board` still applies user filters but skips the completed-visibility filter and sort (the public Roadmap, where the grouping decides which posts appear and in what order). Don't conflate the two: `passthrough` is the data source's claim about `items`; `ownsMembership` is the active grouping's.
- `status {isLoading,isError,retry}` + `renderers.states` let `Board` show loading/error/empty in place of the views (see "Renderer slots"); `pagination {hasMore,isFetchingMore,loadMore,loadMoreLabel?}` drives the footer and the partial-count "+" below. The admin source supplies neither.
- `users` absent = derived from `items` (`core/board-users.ts`).

`getLanderData` (the route loader) attaches a denormalized `organization: {id,name,slug,shortId,logo}` snapshot onto every task at fetch time (the SSE hook attaches the same shape to tasks it receives live) — the board never does a client-side org lookup. Cross-org visibility is "every task in every org you have access to" (matches `getTasksByOrganizationId`'s own scope, no extra filtering), **not** "assigned to me" — that distinction is what makes the "Assigned to me" quick filter meaningful instead of a no-op.

## Live updates (SSE)

The loader result is only a **seed**: `RootProviderLander` keeps the data in its own state and replaces it whenever the loader returns new arrays (re-entering `/home`, `router.invalidate()`, a same-route navigation). The route sets `gcTime: 0` / `staleTime: 0` so an earlier visit's snapshot is never replayed — the store is only live while the layout is mounted. Don't move it back into `useStateManagement`: its `defaultValue` is ignored once a cache entry exists, which was the "stale after coming back" bug.

`useLanderServerEventsSubscription` feeds each SSE event through the pure, unit-tested `applyLanderEvent` (`lib/board/apply-lander-event.ts`) as a functional update. It asks for several channels over its ONE `orgIds` connection (`LANDER_CHANNELS = ["tasks", "releases"]`; the backend joins each requested channel's room in every org the user is a *member* of — `apps/backend/routes/events/channels.ts`, list form only for `orgIds`; the shared `useServerEventsSubscription`'s `channel` accepts `string | string[]`, compared order-insensitively, sent comma-joined). **Keep `tasks` first**: the first channel is the connection's primary one and the task broadcasters' "also push individually" fallback checks `client.channel === "tasks"`. To put another entity on the board: add its channel to `LANDER_CHANNELS`, a handler in the hook, a case in the reducer (+ tests). Note room broadcasts carry **no `scope`** on the wire (only public/per-user ones do) — don't gate a handler on `scope === "CHANNEL"`.

Handled: task create/update/vote; per-org label/category list replacement (INDIVIDUAL scope; labels are also pushed into each task's own `task.labels` copy); **releases** — `UPDATE_RELEASES` carries the release *row* as `data` on create/update/publish (the `{releaseId}` / `{taskId, releaseId}` variants are ignored), upserted as exactly the `release` table's columns (`toCatalogRelease`) for orgs the board shows; `DELETE_RELEASE {releaseId}` (org from `meta.orgId`) removes it and nulls `releaseId` on that org's tasks; the release-publish bulk close (`UPDATE_TASK {taskIds, status:"done"}`). Release status-update/comment events are ignored (ids only; comments include internal ones). The bare `UPDATE_TASK {releaseId: null}` a release delete also sends is ignored — `DELETE_RELEASE` already covers it, so it no longer triggers a resync.

**Creating a task**: `CreateIssueDialog` (mounted globally by `GlobalCreateTaskDialog`; the only caller of `createTaskAction`) posts a `task-created` window message with the record the API returned (`lib/task-created-message.ts`), because the create request carries this client's `sseClientId` and the server therefore doesn't echo the task back. The hook applies it through the same reducer path as `CREATE_TASK` (`applyLanderWindowMessage`: org badge attached, only full task records, only orgs the board shows, same-origin only); whether it is *visible* is the board's normal filters' call.

A resync (loader re-run) is triggered only by `SSE_RECONNECTED` now — events sent while the stream was down are gone.

Local task writes (field pickers, bulk bar, drag) must go through `useBoardData().updateItems?.(prev => …)` (the admin provider maps it to the lander's `updateTasks`; absent on read-only data, so writers no-op) or `useBoardItemActions(task)`, never a list captured from a render — the bulk bar's `tasks` prop is only the *visible* subset, so writing it back would drop every filtered-out task. Local writes are needed at all because edits send the board's `sseClientId`, so the server skips this connection when broadcasting.

## Capabilities

`BoardCapabilities {canDrag, canEditFields, canSelect, canContextMenu, canBulk, canSavedViews}` is passed to `BoardProvider` (`ADMIN_CAPABILITIES` = all true on `/home`; `READ_ONLY_CAPABILITIES` = all false on the public boards). Read with `useBoardCapabilities()`. What each one gates:

| Capability | Gates |
|---|---|
| `canDrag` | dnd-kit in the list (`DraggableBoardList` vs `StaticBoardList`) and kanban (`GridBoardProvider disabled={!canDrag}`, drop executor not mounted) |
| `canEditFields` | The `Field*` pickers: off = `StaticField` (visual only) |
| `canSelect` | The row/card selection checkbox |
| `canContextMenu` | `BoardTaskContextMenu` wrapper: off = renders just its children |
| `canBulk` | `BoardBulkActionBar`, mounted by `Board` |
| `canSavedViews` | In the type, but **nothing reads it today**: saved-view chrome is gated by the scope's persistence (`useBoardViewState().supportsSavedViews`), see `board-saved-views`. Don't assume setting it hides anything |

`resolveCapabilities(base, overrides?, view?)` layers overrides and ANDs in the active view's `supports.drag`; `BoardViewCapabilityScope` (used by `BoardViewShell`) applies that, so a view that can't drag (card) turns `canDrag` off for everything inside it even on an admin board. A view can only narrow, never grant.

## View registry

`views/view-registry-model.ts` (pure) + `views/view-registry.tsx` (icons and built-ins). A view is `BoardViewDefinition {id, label, icon, component({items}), supports, fullBleed?}`:

- `supports {grouping, subGrouping, drag, sort, subtasks: "nested" | "flat"}` — hides the matching controls in `BoardViewOptions` (`getViewOptionVisibility`; the view picker shows only when more than one view is registered) and narrows `canDrag`.
- `fullBleed` — the host should not pad the scroll container around this view. Kanban sets it; `/home`'s `BoardScrollArea` reads it from `useActiveBoardView()` (replaces the old `viewMode === "kanban"` check).
- Built-ins: `LIST_VIEW` (nested subtasks, drag), `KANBAN_VIEW` (flat, drag, `fullBleed`), `CARD_VIEW` (grouping yes, **sub-grouping no, drag no**, flat). `DEFAULT_BOARD_VIEWS = [LIST, KANBAN]` is what `BoardProvider` offers when its `views` prop is absent (admin /home); read with `useBoardViews()`. **Card is not an admin view**: `CARD_VIEW` is only for a page that registers it (none does today), and a saved admin view still set to `"card"` falls back to the list via `getBoardView`.
- `getBoardView(id, views)` / `resolveViewMode`: an id the registry doesn't have falls back to `"list"` (else the first registered view), so stale saved views and hand-edited URLs never blank the board. The registry's id is the persisted `viewMode`; a page-local view id is never persisted (`BoardViewOptions` only writes ids that pass `isPersistedViewMode`).
- Variants of a built-in are registered in `view-registry.tsx` itself (spread the built-in with a different adapter `component` / `supports`), not defined inside a host page: `FLAT_LIST_VIEW` (`LIST_VIEW` with `<BoardListView flatSubtasks />`, `subtasks: "flat"` — the public Feedback board) and `PAGE_SCROLL_KANBAN_VIEW` (`KANBAN_VIEW` with `<BoardKanbanView pageScroll />` — the public Roadmap). Drag is already off there through `READ_ONLY_CAPABILITIES`. The plain `LIST_VIEW`/`KANBAN_VIEW` adapters pass no extra props.
- View props worth knowing: `BoardListView.flatSubtasks` (every task its own top-level row in the given order, no nesting under a parent that is in the list — for server-ranked lists); `BoardKanbanView.pageScroll` (the host page scrolls and gives the board no bounded height: columns lay out at natural height under one scroll area, `mode="grid"` instead of per-column full-height scroll; default false = `/home`'s full-height kanban); `BoardCardView.renderCard` (per-view card override).
- Kanban column counts get a trailing **"+"** when `pagination.hasMore` (more pages exist than are loaded, so the count is a lower bound) — but only in the custom header branch of `KanbanColumnHeader` (a column whose grouping supplies `header` or a description/empty message, i.e. the roadmap's). The default `GridBoardColumnHeader` shows the bare count.

### Card view

`views/board-card-view.tsx`: `<ul role="list">` responsive auto-fill grid, `grid-cols-[repeat(auto-fill,minmax(min(100%,var(--board-card-min,280px)),1fr))] gap-3`; a host retunes the min width by setting the `--board-card-min` custom property on an ancestor (no host currently overrides it). Cells are `renderCard ?? renderers.card ?? BoardCard`, called with `variant="grid"`. Rules: `deriveCardLayout` — `none` grouping (or a lone catch-all column) = one headerless grid; any other grouping = one collapsible `<section>` per group with a sticky `GroupHeaderContent` (collapse state resets only on grouping change, empty groups start collapsed — same as the list view). **No sub-grouping** (ignored, never written to state), **no drag**, **subtasks flat** (every task its own card). Footer = `BoardFooter`. Legacy `components/tasks` pages never offer Card: a persisted `"card"` coerces to `"list"` there (`coerceToLegacyViewMode`, see `board-saved-views`).

## Grouping registry

`config/grouping-registry.ts` (pure, tested) defines the contract; `config/groupings.tsx` registers the built-ins (icons/tones) as `BUILT_IN_GROUPINGS` / `DEFAULT_GROUPING_REGISTRY`. A page adds its own through `BoardProvider`'s `groupings` prop (merged over the built-ins by id; keep the array stable). `BoardGroupingDefinition`:

| Field | Meaning |
|---|---|
| `id`, `label`, `icon` | Registry id, display label, one icon for the "Group by" menu |
| `group(items, ctx) → BoardColumn[]` | `ctx = {data, showCompletedTasks, partial, now}` (`partial` = more pages than loaded; `now` injected so date-dependent groupings stay testable). `BoardColumn {id,label,icon?,toneClassName?,color?,items,header?,description?,emptyMessage?,subGroups?}` — `header` replaces the kanban column's label/icon, `description`/`emptyMessage` render under it |
| `getDropPatch?(item, columnId, ctx)` | The field patch a drop writes, or `null`. **Absent = drag-to-regroup no-ops** (assignee, org, `none`, and every read-only page-local grouping) |
| `persistable` | May be stored in a saved view. False for page-local groupings (`none`, roadmap's) |
| `ownsMembership?` | The grouping decides which items exist and their order: `Board` skips completed-visibility filter and sort (user filters still apply) |
| `keepEmptyColumns?` | Kanban keeps columns with no items (it drops them by default) |
| `multiMembership?` | One item can sit in several columns (assignee): kanban grid ids become `${id}:${columnId}:${rowId}` |
| `canSubGroup?` | Default true; false = sub-grouping resolves to `none` (`resolveEffectiveSubGrouping`) |

Built-ins: status, org, priority, assignee, category, release, plus **`none`** (`NONE_GROUPING_ID`; one header-less `"__all__"` column; `persistable: false`, `canSubGroup: false`, not in the Group-by menu). An unknown id resolves to `status` (`resolveGroupingDefinition`). `groupTasksAsColumns` / `applyNestedGroupingAsColumns` return the `items`-keyed `BoardColumn`s (kanban); `groupTasks` / `applyNestedGrouping` are the same mapped to the `tasks`-keyed `BoardTaskGroup`s (list/card). `TaskViewState.grouping` is typed as the persistable `TaskGroupingId`; a page-local id is narrowed into it only via `pageLocalGrouping(id)` (`core/view-config.ts`).

## Renderer slots

`BoardRenderers {row?, card?, listContainer?, footer?, states?}`, supplied through `BoardProvider`'s `renderers` prop and read with `useBoardRenderers()` (empty object when absent). An absent slot = the admin rendering:

| Slot | Used by | Default |
|---|---|---|
| `row` (`{task, nested?}`) | List rows (top-level, nested subtasks, drag overlay); may ignore `nested` | `BoardRow` |
| `card` (`{task, variant?: "kanban" \| "grid"}`) | Kanban cells and the card grid | `BoardCard` |

The whole `BoardCard` is the link (like `BoardRow`): a click inside an element marked `data-no-propagate` (field picker triggers, the checkbox, the `vote` slot) is swallowed instead of opening the task, so anything interactive added to a card needs that attribute. `BoardCard` takes optional props so a host's `renderers.card` can be a thin wrapper around it instead of new card markup: `link` (`BoardCardLink`: admin task page by default, or a public post), `onLinkClick`, `header` (replaces the org/task-key line above the title; `null` drops it), `fields` (`BoardField[]`, default priority/category/release/label/assignee), `selected` (open in a side panel) and `vote` (replaces the read-only vote count, `task.voteCount`, at the bottom right of the chip row; every admin card shows that count). The public roadmap's `RoadmapBoardCard` is the example.
| `listContainer` (`{children}`) | Wraps the rows of each list *leaf* section (not parents of sub-groups) | rows render bare |
| `footer` | Rendered by list, kanban and card views through `BoardFooter`, **only while `pagination.hasMore`** — a custom footer never re-checks it | `BoardLoadMore` (button labelled `pagination.loadMoreLabel`, default "Show more") |
| `states {loading?,error?,empty?}` (ReactNode) | Replace the views in `Board` via the pure `resolveBoardState`: loading/error only while there are no items (a refetch over existing items keeps them); loading with no slot renders nothing; error/empty with no slot fall through to the views | views render |

The public boards currently don't use `states`: they keep skeleton/error/empty at page level (see `public-portal`). Custom renderers receive only `{task}` (+ variant/nested), so anything else they need comes from hooks the renderer calls itself (the public row reads `useBoardReleases` and the optional Peek context directly) — don't thread it through an extra wrapper context.

## Theming

There is none: the board always renders with the admin tokens, on admin and public pages alike. `<Board />` returns a fragment (no wrapper element). An earlier `theme` prop (`"admin" | "portal"`, a `data-board-theme` root and a `--portal-*` override block in `styles.css`) was removed — don't reintroduce a per-host theme; a host that needs a different look passes `renderers` that use the admin tokens.

## Filter engine

`FIELD_CONFIGS` (`filter-config.tsx`) is an array of `FilterFieldConfig` — one entry per filterable field (`org`, `status`, `priority`, `category`, `release`, `assignee`, `label`, `creator`, `created_at`/`updated_at` — not addable yet, no range UI — `title`). Each entry's `getOptions(tasks, labels, users, subSearch, categories, releases)` builds the value-picker's option list, and `filterDefault` sets the operator a newly-added condition starts with.

**`FilterCondition.value` always stores literal database ids, never names or labels** — `evaluateCondition`/`extractFieldValue` never change based on which field they're looking at beyond the initial `switch`, they just pull the task's own id(s) for that field and check membership against `condition.value` via the shared `any`/`all`/`none`/`exact` operator handlers. This is why adding a new id-bearing filterable field is usually just: add a `FIELD_CONFIGS` entry, add an `extractFieldValue` case — no evaluator rework needed.

**Cross-org name matching for `label`/`category`/`release`.** Those three are genuinely per-org DB rows (`organizationId notNull` FK) — the same label *name* in two orgs is two different ids. `getOptions` groups same-named rows across orgs into one `FilterOption` via `groupOptionsByName` (+ `buildOrgNameMap` for org display names, derived from `tasks[].organization`, no extra fetch): a name unique to one org gets `orgName` (shown as a trailing badge in the picker); a name shared by 2+ orgs gets `mergedValues: string[]` (every matching id) instead. Selecting a merged option pushes *all* of `mergedValues` into the condition atomically — `filter-builder-condition-row.tsx` does this via `ComboBoxItem`'s `onSelect` prop, which **fully bypasses** the item's own default single-value toggle when provided (confirmed by reading `combo-box-unified.tsx`, `handleSelect`'s `if (onSelect) { onSelect(value); return; }` early-return). `evaluateCondition` needed zero changes for this — the condition's `value` array just legitimately contains multiple ids now, and the existing `any`/`all`/`none`/`exact` handlers already do array-membership checks. `assignee`/`creator` do **not** have this problem — `user.id` is one global PK, already correctly unified cross-org by identity; don't apply the same name-merge treatment there, it would incorrectly conflate two different people who happen to share a display name.

`FilterBuilderConditionRow`'s trigger button renders the *actual selected options* (icon/color + name, up to 3, then `+N`) computed from an **unfiltered** `getOptions(..., "")` call — not the live-search-scoped `options` used for the dropdown list itself. Reuse that pattern (`allOptions` vs `options`) for any similar "show what's selected" UI; sourcing selected-chip labels from the search-filtered list would make an already-selected item disappear from the trigger the moment it stops matching the user's typed query.

`FilterBuilder`'s condition list only ever operates on `filters.groups[0]` (single AND-ed group) — `FilterState.groups` structurally supports multiple OR'd groups, but nothing populates more than one. Don't build OR-group UI without also revisiting `use-board-view-state.ts`'s `addFilter`/`mergeOrAppendCondition`.

## Grouping & subtask nesting

`groupTasks(tasks, groupBy, options)` (`groupings.tsx`) is a facade over the grouping registry (see "Grouping registry"): `groupBy` is any registered id (the persistable `TaskGroupingId`s `"status" | "priority" | "assignee" | "category" | "release" | "org"`, plus `none` and page-local ids). `applyNestedGrouping` runs it twice for one level of sub-grouping. `showCompletedTasks: false` drops the Done/Canceled **group entries themselves** (Board already pre-filters the tasks unless the data is `passthrough` or the grouping `ownsMembership`; this only needs to hide the two now-redundant group buckets).

Subtask nesting (`getTopLevelTasks`/`buildSubtaskMap`) is **list-view only** — kanban and card render subtasks as independent cards, and the list does too when `flatSubtasks` is set. A task counts as top-level if it has no `parentId`, or its parent isn't in the same (filtered) list — it falls back to top-level rather than vanishing. `board-list-view.tsx` groups `getTopLevelTasks(tasks)`, not the raw prop, specifically so subtasks don't get their own top-level group membership; subtasks render via a plain (non-sortable) row (`renderers.row ?? BoardRow`, with `nested`), never registered in the dnd-kit sortable system at all.

Sort order and group/display order for status are **two intentionally different rankings** — `sort-config.ts`'s `STATUS_ORDER` puts `in-progress` first (surfaces active work), `groupings.tsx`/`STATUS_CONFIG`'s key order is the literal workflow sequence (backlog→todo→in-progress→done→canceled). Don't "fix" one to match the other.

## Layout & command palette

`/home` composes the pieces itself (`pages/admin/home/index.tsx`) — `Board` renders none of this chrome. Header identity: a "Home" button (clears the view) and `ActiveViewSwitcher`, with the panel toggle on the right. The board sits in `BoardScrollArea`, a component inside `AdminBoardProvider` that drops the container padding when `useActiveBoardView().fullBleed` (kanban). Toolbar: `TaskCountLabel` on the left; `FilterBuilder` + `BoardViewOptions` on the right. Right panel (the shared `Page` / `IndentDrawer` system — see the `page-component` skill): `panels.right` with `defaultOpen: true`, `persistOpenState: false`, `showClose: false`, header = `ActiveViewPanelHeader` + `ActiveViewPanelPinButton`, body = `BoardSidePanelContent` (just `QuickFilterPanel`). There is no top-bar/panel layout preference: an earlier `landerLayout` swap (filter builder vs view list, in either slot) was removed. Don't reintroduce it, and don't put the filter builder back in the panel — the toolbar's Filter button owns it.

`useLanderCommands.tsx` registers `/home`-only Cmd+K commands: open filter builder, switch view (sub-menu), save current view, and one per quick filter. The "open X" commands act by clicking a real trigger found via `[data-command-target="..."]` after closing the palette and a `setTimeout` for its close animation (the same pattern `useTasksCommands.tsx` uses for "Filter tasks"): `filter-builder-trigger` for the builder; for "Save current view", `active-view-switcher-trigger` first (the Save row only exists inside the switcher's open dropdown), then `save-view-trigger` on a later timeout. "Save current view" is `show: isDirty` (from `useActiveView`), so it's hidden when there's nothing to save. `BoardViewOptions` is a separate popover (the registered views from `useBoardViews()` — hidden when only one is registered; group-by (hidden when the active view `!supports.grouping`), sub-group-by excluding the current top-level grouping (hidden when the active view `!supports.subGrouping`, e.g. Card), sort+direction, show-completed) — all read/write straight through `useBoardViewState()`.

## Rules

1. **Never import from `apps/start/src/components/tasks/**`** anywhere under `board/` — fork instead, and say why in a header comment like every existing fork does. The sole exception is `core/admin-board-provider.tsx`. Likewise, **only that file may call `useLanderData()`** — everything else reads `useBoardData()` (never `useLanderData()`).
2. **`board.tsx` doesn't fetch, takes no props and doesn't render toolbar chrome** — new page-level controls go in the page's `PageHeader.Toolbar`, not inside `Board`; data comes from a `BoardProvider`.
2a. **Gate behaviour on a capability, not on "which page am I".** A new interactive affordance reads `useBoardCapabilities()` and must degrade to a static/no-op form when off (like `StaticField`); a new view registers its limits in `supports` rather than being special-cased in `BoardViewOptions`/`/home`. Don't add a `viewMode === "…"` check in a host — read the registry (`fullBleed`, `supports`).
2b. **Presentation differences go through `renderers`/`groupings`/`views` on the provider**, not forks of `BoardRow`/`BoardCard`/the views. Memoise or hoist everything you pass to `BoardProvider` (`data`, `scope`, `views`, `groupings`, `renderers`): they are context values, and a fresh object re-renders every board consumer.
2c. **`useItemActions` must keep a stable identity per provider** (module-level function): the board calls it as a hook per row/card/menu.
3. **Filter condition values are ids, not names** — the one deliberate exception is the label/category/release cross-org merge, which still stores ids (plural), never a name string.
4. **A dnd-kit sortable id must be the bare task id**, never container-prefixed (`${containerId}:${task.id}`) — an id that changes mid-drag (which a multi-container `onDragOver` reshuffle does) breaks dnd-kit's assumptions and caused a real infinite-render-loop bug. Resolve group membership by lookup instead.
5. **Drag-to-regroup intentionally no-ops for `assignee` and `org` groupings** — they define no `getDropPatch` (`config/groupings.tsx`; `board-drag-actions.tsx` just calls it when present). A multi-assignee task can't express "which bucket to keep" via a single drop target, and org isn't a mutable field. Don't add a `getDropPatch` there without solving that ambiguity first; a new grouping that should support drag defines one that returns a patch (or `null` for "nothing to do").
6. **Reuse `ROW_LEADING_GUTTER_CLASS`/`ORG_KEY_SLOT_CLASS`** (`field-config.tsx`) for any new fixed-width row/header slot — every existing square icon column depends on this single source of truth to stay aligned.

## Gotchas

- **Pure modules are split out so vitest can run them**: `apps/start/vitest.config.ts` has no `@/` alias and no jsdom, so logic that wants a test lives in a `.ts` file with relative/type-only imports (`core/{capabilities,renderers,scope-config,view-config,board-users}.ts`, `config/grouping-registry.ts`, `views/{view-registry-model,kanban-model,card-sections}.ts`, each with a `*.test.ts` beside it). Put new derivation logic there, not in the `.tsx` that renders it.
- **`field-config.tsx`'s status/priority/visibility values are hardcoded, not read live off `schema.statusEnum.enumValues`.** Deliberate: this file is imported by client-rendered pickers, and the `schema` runtime value pulls in the full Drizzle module (`node:crypto`), which Vite can't bundle for the browser. If a DB enum value is ever added/removed, TypeScript's `Record<StatusValue, ...>` key mismatch is the safety net — there's no runtime check.
- **The shared `StatusIcon` glyph hardcodes its own color for `done`/`canceled`**, ignoring the caller's `className` for those two — `canceled`'s `textClassName` needs a Tailwind `!` prefix to actually win.
- **Kanban's grid mode switches `"kanban"` ↔ `"grid"` based on whether sub-grouping is active, or `pageScroll` is set** (`board-kanban-view.tsx`: `"kanban"` only when `subGrouping === "none" && !pageScroll`) — `"kanban"` mode's independent per-column scroll needs `GridBoardCells` as a direct flex child of the provider, which breaks once rows/sub-grouping nests it one level deeper, and needs a bounded height the host must provide (a page that scrolls as a whole, like the roadmap, passes `pageScroll`). Matches the old org-scoped kanban's own equivalent switch.
- **`GridBoardProvider`'s `disabled` (`packages/ui/.../doras-ui/grid-board.tsx`) is what makes read-only kanban work**: no sensors, `useSortable`/`useDroppable` disabled, no drag overlay, and `GridBoardItem` renders a plain wrapper with no dnd-kit `role="button"`/`tabIndex`/listeners — without that, links and buttons inside cards would be hijacked. Default false, so the other `grid-board` consumers (`releases-kanban.tsx`, `tasks/views/unified-task-view.tsx`) are unchanged.
- **A multi-assignee task can legitimately occupy more than one kanban cell at once** — `getGridItemId` uses `${task.id}:${columnId}:${rowId}` (not bare `task.id`) specifically when grouping/sub-grouping by assignee, to avoid an id collision across cells.
- **List view's collision-detection freezes for one animation frame after a drag reshuffle** (`board-list-view.tsx`, modeled on dnd-kit's own documented `recentlyMovedToNewContainer` workaround) — this is a real fix for an oscillation bug, not incidental complexity.
- **List view's collapsed-section state resets only when `grouping`/`subGrouping` changes**, deliberately not on every task-data change — a `showCompletedTasks` toggle that empties a group mid-session shouldn't fight a user's manual expand/collapse choice.
- **The nested-row connector-glyph column-shift trick** (`board-row.tsx`): a subtask's checkbox sits at the exact same x as a top-level row's (Linear does the same), and a nested row adds one *extra* fixed-width column (the connector glyph) right after it — because every leading column shares one width constant, that single extra column shifts the whole row over by exactly one slot, landing the connector under the parent's status column, the subtask's status under the parent's priority column, etc. An earlier version tried to also align the *group header's* icon with row status icons via invisible spacers — that was reverted as forced-looking; only the chevron deliberately aligns with the checkbox slot.
