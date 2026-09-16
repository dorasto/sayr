---
name: board
description: The reusable cross-org task board (list/kanban rendering, field pickers, grouping, filtering, layout) powering /home — use whenever adding/editing a board field, filter, grouping, view mode, or anything under apps/start/src/components/board/
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

`apps/start/src/components/board/` is a from-scratch, page-agnostic task board built for SAY-73's unified cross-org lander (`/home`). "From scratch" is a hard boundary, not a suggestion: **zero imports from `apps/start/src/components/tasks/**`**, the older org-scoped `UnifiedTaskView` system. Every forked file (`filter/types.ts`, `filter/operators.ts`, `filter/sort-config.ts`, `config/field-config.tsx`, `config/groupings.tsx`, etc.) says so in its own header comment, with a reason specific to that file — a differing field vocabulary (`"org"` doesn't exist in the old system), a Vite/`node:crypto` bundling constraint, or simply "the old system is retired." **This boundary is convention-only — nothing lints or builds against it.** It has held so far (verified via grep, zero violations), but don't assume a future PR can't break it silently.

The board is genuinely page-agnostic: `<Board tasks={tasks} />` (`board.tsx`) takes exactly one prop, the already-fetched task list. It does not fetch data, and it does not render any page chrome (filter bar, view switcher, save-view button) — those live in the *page's* `PageHeader.Toolbar`, composed from the pieces below. `/home` (`apps/start/src/components/pages/admin/home/index.tsx`) is the only current consumer and the reference integration to copy if this ever gets reused elsewhere.

Saved/personal views (the store, the three different view-switcher UIs, dirty-state detection) are a big enough sub-area to have their own skill — see `board-saved-views`. This skill covers everything else: rendering, fields, grouping, filtering, layout, and command palette wiring.

## Key files

| Area | File | Purpose |
|---|---|---|
| Entry point | `board.tsx` | Applies filters → completed-visibility → sort (one `useMemo`), delegates to `views/board-view-shell.tsx` |
| View dispatch | `views/board-view-shell.tsx` | `viewMode === "kanban" ? BoardKanbanView : BoardListView`, reads `viewMode` from `useBoardViewState()` |
| List view | `views/board-list-view.tsx` | dnd-kit multi-container sortable list, subtask nesting, sticky group headers |
| Kanban view | `views/board-kanban-view.tsx` | Wraps `packages/ui/.../doras-ui/grid-board.tsx` (generic, dnd-kit encapsulated inside it) |
| Row / card | `views/board-row.tsx`, `views/board-card.tsx` | Compose the field pickers below into a list row / kanban card |
| Group header | `views/group-header.tsx` | Shared tinted-pill header, used by list sticky headers |
| Drag commit | `views/board-drag-actions.tsx` | Maps a drop to a field-update patch; assignee/org groupings intentionally no-op on drag |
| Field config | `config/field-config.tsx` | `STATUS_CONFIG`/`PRIORITY_CONFIG`/`VISIBILITY_CONFIG` + `ROW_LEADING_GUTTER_CLASS`/`ORG_KEY_SLOT_CLASS` |
| Grouping | `config/groupings.tsx` | `groupTasks`/`applyNestedGrouping`/`getTopLevelTasks`/`buildSubtaskMap` |
| Grouping options | `config/grouping-options.tsx` | `TASK_GROUPING_OPTIONS`/`TASK_GROUPINGS` for the "Group by" menu |
| Field pickers | `fields/field-{status,priority,assignee,label,category,release,visibility}.tsx`, `fields/field-toolbar.tsx` | One picker per field, `FieldToolbar` composes a subset via `fields={[...]}` |
| Filter types | `filter/types.ts` | `FilterField`/`FilterCondition`/`FilterOption`/`FilterFieldConfig` |
| Filter engine | `filter/filter-config.tsx` | `FIELD_CONFIGS`, `applyFilters`, `evaluateCondition`/`extractFieldValue` |
| Filter UI | `filter/filter-builder.tsx`, `filter/filter-builder-condition-row.tsx` | Condition list + per-condition value picker |
| Filter helpers | `filter/multi-select.ts`, `filter/serialization.ts`, `filter/operators.ts`, `filter/sort-config.ts` | Toggle/merge logic, URL round-trip, operator labels, sort fields |
| State hook | `filter/use-board-view-state.ts` | Combined filter+viewConfig state, URL sync, saved-view apply/reset — see `board-saved-views` |
| Quick filters | `quick-filters/quick-filter-config.tsx`, `quick-filters/quick-filter-chips.tsx` | `QUICK_FILTERS` array → `ToggleGroup` chips |
| Layout | `layout/board-top-bar.tsx`, `layout/board-side-panel.tsx`, `layout/board-view-options.tsx` | `landerLayout` preference dispatch, list/kanban/group-by/sort/show-completed popover |
| Command palette | `apps/start/src/hooks/commands/useLanderCommands.tsx` | `/home`-only Cmd+K commands, mounted via `LanderCommandRegistrar` inside `RootProviderLander` |

## Data flow

```
route loader (getLanderData)          — apps/start/src/routes/(admin)/home/route.tsx
  → RootProviderLander (ContextLander) — tasks/labels/categories/releases/permissionsByOrg
    → AdminHomePage                    — pages/admin/home/index.tsx, reads useLanderData().tasks
      → <Board tasks={tasks} />
          filters (useBoardViewState)  → applyFilters(tasks, filters)
          showCompletedTasks           → drop done/canceled
          sortBy/sortDirection         → sortTasks(...)
        → <BoardViewShell tasks={visibleTasks} />
            viewMode === "kanban" → BoardKanbanView : BoardListView
              → applyNestedGrouping(tasks, grouping, subGrouping)
                → BoardRow / BoardCard  → FieldStatus/FieldPriority/FieldAssignee/FieldLabel/...
```

`getLanderData` (the route loader) attaches a denormalized `organization: {id,name,slug,shortId,logo}` snapshot onto every task at fetch time — the board never does a client-side org lookup. Cross-org visibility is "every task in every org you have access to" (matches `getTasksByOrganizationId`'s own scope, no extra filtering), **not** "assigned to me" — that distinction is what makes the "Assigned to me" quick filter meaningful instead of a no-op.

## Filter engine

`FIELD_CONFIGS` (`filter-config.tsx`) is an array of `FilterFieldConfig` — one entry per filterable field (`org`, `status`, `priority`, `category`, `release`, `assignee`, `label`, `creator`, `created_at`/`updated_at` — not addable yet, no range UI — `title`). Each entry's `getOptions(tasks, labels, users, subSearch, categories, releases)` builds the value-picker's option list, and `filterDefault` sets the operator a newly-added condition starts with.

**`FilterCondition.value` always stores literal database ids, never names or labels** — `evaluateCondition`/`extractFieldValue` never change based on which field they're looking at beyond the initial `switch`, they just pull the task's own id(s) for that field and check membership against `condition.value` via the shared `any`/`all`/`none`/`exact` operator handlers. This is why adding a new id-bearing filterable field is usually just: add a `FIELD_CONFIGS` entry, add an `extractFieldValue` case — no evaluator rework needed.

**Cross-org name matching for `label`/`category`/`release`.** Those three are genuinely per-org DB rows (`organizationId notNull` FK) — the same label *name* in two orgs is two different ids. `getOptions` groups same-named rows across orgs into one `FilterOption` via `groupOptionsByName` (+ `buildOrgNameMap` for org display names, derived from `tasks[].organization`, no extra fetch): a name unique to one org gets `orgName` (shown as a trailing badge in the picker); a name shared by 2+ orgs gets `mergedValues: string[]` (every matching id) instead. Selecting a merged option pushes *all* of `mergedValues` into the condition atomically — `filter-builder-condition-row.tsx` does this via `ComboBoxItem`'s `onSelect` prop, which **fully bypasses** the item's own default single-value toggle when provided (confirmed by reading `combo-box-unified.tsx`, `handleSelect`'s `if (onSelect) { onSelect(value); return; }` early-return). `evaluateCondition` needed zero changes for this — the condition's `value` array just legitimately contains multiple ids now, and the existing `any`/`all`/`none`/`exact` handlers already do array-membership checks. `assignee`/`creator` do **not** have this problem — `user.id` is one global PK, already correctly unified cross-org by identity; don't apply the same name-merge treatment there, it would incorrectly conflate two different people who happen to share a display name.

`FilterBuilderConditionRow`'s trigger button renders the *actual selected options* (icon/color + name, up to 3, then `+N`) computed from an **unfiltered** `getOptions(..., "")` call — not the live-search-scoped `options` used for the dropdown list itself. Reuse that pattern (`allOptions` vs `options`) for any similar "show what's selected" UI; sourcing selected-chip labels from the search-filtered list would make an already-selected item disappear from the trigger the moment it stops matching the user's typed query.

`FilterBuilder`'s condition list only ever operates on `filters.groups[0]` (single AND-ed group) — `FilterState.groups` structurally supports multiple OR'd groups, but nothing populates more than one. Don't build OR-group UI without also revisiting `use-board-view-state.ts`'s `addFilter`/`mergeOrAppendCondition`.

## Grouping & subtask nesting

`groupTasks(tasks, groupBy, options)` (`groupings.tsx`) switches on `TaskGroupingId` (`"status" | "priority" | "assignee" | "category" | "release" | "org"`). `applyNestedGrouping` runs it twice for one level of sub-grouping. `showCompletedTasks: false` drops the Done/Canceled **group entries themselves** (Board already pre-filters the tasks; this only needs to hide the two now-redundant group buckets).

Subtask nesting (`getTopLevelTasks`/`buildSubtaskMap`) is **list-view only** — kanban still renders subtasks as independent cards. A task counts as top-level if it has no `parentId`, or its parent isn't in the same (filtered) list — it falls back to top-level rather than vanishing. `board-list-view.tsx` groups `getTopLevelTasks(tasks)`, not the raw prop, specifically so subtasks don't get their own top-level group membership; subtasks render via a plain (non-sortable) `BoardRow`, never registered in the dnd-kit sortable system at all.

Sort order and group/display order for status are **two intentionally different rankings** — `sort-config.ts`'s `STATUS_ORDER` puts `in-progress` first (surfaces active work), `groupings.tsx`/`STATUS_CONFIG`'s key order is the literal workflow sequence (backlog→todo→in-progress→done→canceled). Don't "fix" one to match the other.

## Layout & command palette

`landerLayout` (`user-preferences-store.ts`, `"presetTop" | "presetSide"`, localStorage-persisted alongside `taskOpenMode` in the same store) drives **complementary, not independent**, slots: `board-top-bar.tsx` puts `PresetSwitcher` in the top bar when `"presetTop"`, else `FilterBuilder`; `board-side-panel.tsx` does the exact inverse for whichever one didn't get the top bar. Changing one file's logic without the other breaks the pairing. `QuickFilterChips` always renders in the top bar regardless of layout.

`useLanderCommands.tsx` registers `/home`-only Cmd+K commands (open filter builder, toggle layout, save current view, switch view, one per quick filter). Because `landerLayout` decides which of {FilterBuilder, PresetSwitcher} is a real top-bar trigger vs inline-in-panel content with no trigger, the "open X" commands click through the DOM (`document.querySelector('[data-command-target="..."]')`) after closing the palette and a `setTimeout(200)` for the close animation, reading `userPreferencesStore.state.landerLayout` fresh at click time rather than a captured value — so toggling layout doesn't go stale. `BoardViewOptions` is a separate popover (list/kanban, group-by, sub-group-by excluding the current top-level grouping, sort+direction, show-completed) — all read/write straight through `useBoardViewState()`.

## Rules

1. **Never import from `apps/start/src/components/tasks/**`** anywhere under `board/` — fork instead, and say why in a header comment like every existing fork does.
2. **`board.tsx` doesn't fetch and doesn't render toolbar chrome** — new page-level controls go in the page's `PageHeader.Toolbar`, not inside `Board`.
3. **Filter condition values are ids, not names** — the one deliberate exception is the label/category/release cross-org merge, which still stores ids (plural), never a name string.
4. **A dnd-kit sortable id must be the bare task id**, never container-prefixed (`${containerId}:${task.id}`) — an id that changes mid-drag (which a multi-container `onDragOver` reshuffle does) breaks dnd-kit's assumptions and caused a real infinite-render-loop bug. Resolve group membership by lookup instead.
5. **Drag-to-regroup intentionally no-ops for `assignee` and `org` groupings** (`board-drag-actions.tsx`) — a multi-assignee task can't express "which bucket to keep" via a single drop target, and org isn't a mutable field. Don't add drag support there without solving that ambiguity first.
6. **Reuse `ROW_LEADING_GUTTER_CLASS`/`ORG_KEY_SLOT_CLASS`** (`field-config.tsx`) for any new fixed-width row/header slot — every existing square icon column depends on this single source of truth to stay aligned.

## Gotchas

- **`field-config.tsx`'s status/priority/visibility values are hardcoded, not read live off `schema.statusEnum.enumValues`.** Deliberate: this file is imported by client-rendered pickers, and the `schema` runtime value pulls in the full Drizzle module (`node:crypto`), which Vite can't bundle for the browser. If a DB enum value is ever added/removed, TypeScript's `Record<StatusValue, ...>` key mismatch is the safety net — there's no runtime check.
- **The shared `StatusIcon` glyph hardcodes its own color for `done`/`canceled`**, ignoring the caller's `className` for those two — `canceled`'s `textClassName` needs a Tailwind `!` prefix to actually win.
- **Kanban's grid mode switches `"kanban"` ↔ `"grid"` based on whether sub-grouping is active** (`board-kanban-view.tsx`) — `"kanban"` mode's independent per-column scroll needs `GridBoardCells` as a direct flex child of the provider, which breaks once rows/sub-grouping nests it one level deeper. Matches the old org-scoped kanban's own equivalent switch.
- **A multi-assignee task can legitimately occupy more than one kanban cell at once** — `getGridItemId` uses `${task.id}:${columnId}:${rowId}` (not bare `task.id`) specifically when grouping/sub-grouping by assignee, to avoid an id collision across cells.
- **List view's collision-detection freezes for one animation frame after a drag reshuffle** (`board-list-view.tsx`, modeled on dnd-kit's own documented `recentlyMovedToNewContainer` workaround) — this is a real fix for an oscillation bug, not incidental complexity.
- **List view's collapsed-section state resets only when `grouping`/`subGrouping` changes**, deliberately not on every task-data change — a `showCompletedTasks` toggle that empties a group mid-session shouldn't fight a user's manual expand/collapse choice.
- **The nested-row connector-glyph column-shift trick** (`board-row.tsx`): a subtask's checkbox sits at the exact same x as a top-level row's (Linear does the same), and a nested row adds one *extra* fixed-width column (the connector glyph) right after it — because every leading column shares one width constant, that single extra column shifts the whole row over by exactly one slot, landing the connector under the parent's status column, the subtask's status under the parent's priority column, etc. An earlier version tried to also align the *group header's* icon with row status icons via invisible spacers — that was reverted as forced-looking; only the chevron deliberately aligns with the checkbox slot.
