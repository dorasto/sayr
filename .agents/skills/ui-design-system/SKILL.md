---
name: ui-design-system
description: How to design or restyle any UI in apps/start (admin or public) using Sayr's own components and tokens instead of custom one-off markup — which @repo/ui / doras-ui / tomui component to reach for, Button/Label/Tile variants, tokens, type scale, the global heading CSS trap, Base UI `render` vs Radix `asChild`, popup layering, and the "copy the nearest sibling screen" workflow. Use before building or redesigning a page, panel, card, form, dialog, or any visual polish task.
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

Sayr has one design system: the shadcn-derived `@repo/ui` package, themed by CSS variables in `packages/ui/src/globals.css`, plus a handful of app-level field components. Every screen (admin and the public portal alike) is supposed to look like it came from the same hands. The failure this skill prevents is an agent asked to "design X" inventing its own look: raw `<div>`s with hand-picked colours (`bg-zinc-900`, `text-gray-400`, hex values), a new card or chip component when `Tile`/`Badge`/a `Field*` already exists, a parallel token set (the public portal once grew a whole `--portal-*` system and `PortalButton`/`PortalCard` layer that later had to be deleted), or heading sizes that silently don't apply.

**Default stance: compose existing components, pass them variants, and add only layout utilities (flex, gap, padding, width) yourself.** If you're writing colour, border, radius or font-size classes on more than the odd element, stop and look for the component that already owns that look.

Related skills: `page-component` (page layout and side panels), `page-header` (the h-11 header), `board` (task lists and kanban), `public-portal` (portal-specific pieces and rules). Read the relevant one too; this skill doesn't repeat them.

## Workflow: copy the nearest sibling

1. **Find the closest existing screen** and open it in code (and in the browser if one's running). New panel? Copy the task panel (`components/tasks/task/task-content.tsx` + `TaskFieldToolbar variant="sidebar"`). New detail page? Copy the task page or the public post page. New list? It's probably a `board` provider, not a new list. New settings section? Copy a sibling under `components/pages/admin/settings`.
2. **Reuse its components and classNames verbatim** for the same kind of element: same row, same heading, same chip, same spacing. Consistency beats local improvement; if the sibling's style looks wrong, fix it in the shared place so both change.
3. **Search before building** (AGENTS.md): grep `packages/ui/src/components`, `apps/start/src/components/tasks/shared`, `components/board/fields`, `components/public/portal/ui`, and `@repo/util` for the thing you're about to write.
4. **Compare side by side** with the sibling at the end: alignment, font size, icon size, gaps, hover states. "Rows don't line up", "inputs are a different colour", and "this is centered but the task panel isn't" are the regressions users actually report.

## Component inventory

All under `packages/ui/src/components/` and imported as `@repo/ui/components/<path>`.

| Need | Use | Notes |
|---|---|---|
| Any clickable control | `button` (`Button`) | See variants below. Links that look like buttons: `<Button render={<Link …/>} nativeButton={false}>` |
| Text label / small heading | `label` (`Label`) | `variant`: `default` (sm), `heading` (base, semibold), `subheading` (sm, semibold), `description` (xs, muted). Use it for section titles in compact UI instead of `<h2>`/`<h3>` |
| Card / panel block / list item | `doras-ui/tile` (`Tile`, `TileHeader`, `TileIcon`, `TileTitle`, `TileDescription`, `TileAction`) | `variant`: `default` (`bg-card`), `transparent`, `outline`. `rounded-xl p-3`, `md:w-fit` by default, so add `md:w-full` for full-width |
| Small status/meta pill | `badge` (`Badge`) | `variant="secondary"` for neutral meta |
| Avatar | `avatar` + `getInitials`/`getDisplayName`/`ensureCdnUrl` from `@repo/util` | Never a raw `<img>` for a user |
| Picker with search (status, labels, people) | `tomui/combo-box-unified` (`ComboBox*`) | Popover on desktop, drawer on mobile, built in. Task-field pickers already wrap it (`components/tasks/shared/*.tsx`: `GlobalTaskStatus`, `GlobalTaskLabels`, …) |
| Simple menu | `dropdown-menu` | |
| Floating content | `popover`, `tooltip`, `hover-card` | |
| Dialogs | `dialog`, `alert-dialog` (destructive confirms), `adaptive-dialog` (dialog on desktop, drawer on mobile), `tomui/tabbed-dialog` (settings-style) | |
| Tabs | `cossui/tabs` (`Tabs`/`TabsList`/`TabsTab`) | |
| Command palette / search | `command` (`CommandDialog`, `Command*`) | `commandProps` passes through to cmdk (e.g. `shouldFilter: false` for server search). See the `command-palette` skill for the global palette |
| Inputs | `input`, `textarea`, `input-group`, `select`, `checkbox`, `switch`, `calendar` (inside a `Popover`) | |
| Loading | `skeleton`, `spinner` | Skeletons should match the final layout's shape |
| Progress / charts | `progress`; `apps/start/src/components/charts` (`SimpleAreaChart`, `TaskPriorityBar`, …) | |
| Side panel / drawer | `Page` + `IndentDrawer` | Never a new Sheet/drawer; see `page-component` |
| Kanban / list of tasks | the board (`components/board`) | See `board` |
| Toasts | `useToastAction().runWithToast(...)` (`apps/start/src/lib/util`) for async actions; `headlessToast` for one-offs | |
| Icons | `@tabler/icons-react` | The app standard (~250 files). A few older files and `@repo/ui` internals use lucide; don't add new lucide imports in app code |
| Rich text (render or edit) | the ProseKit `Editor` (`components/prosekit`) | Read-only rendering inside a prose class string; see `public-portal` "Rich text" |

**Task fields** (status, priority, category, labels, assignees, release, votes): never rebuild a chip. Inside admin task UI use the `Global*` pickers / `TaskFieldToolbar`. Inside a `BoardProvider` (admin or public) use the board's `Field*` components (read-only when capabilities say so). Outside a board on public pages use `components/public/portal/ui` (`StatusChip`, `CategoryTag`, `LabelTag`, `ReleaseTag`). Task keys are always `formatTaskKey()` (see AGENTS.md "Task identifiers").

### Button variants in practice

| Variant | Where it's used |
|---|---|
| `primary` | The workhorse for app chrome: field pills, toolbar buttons, panel rows. `bg-accent`, `rounded-xl`, border on hover. In panels it's flattened with `bg-transparent p-1 h-auto w-fit justify-start text-xs shadow-none` (the task panel's sidebar style, `VARIANT_STYLES.sidebar` in `tasks/shared/task-field-toolbar-types.ts`) |
| `accent` | Header toggles (e.g. the panel toggle: `h-6 w-fit p-1 bg-accent border-transparent`) |
| `ghost` | Icon-only actions, quiet secondary actions |
| `default` | The one solid primary CTA on a surface (submit, "Write a post") |
| `outline`, `secondary` | Secondary actions in forms/dialogs |
| `destructive` | Destructive confirms only |
| `link` | Inline text links styled as buttons |

Sizes: app chrome is mostly `size="sm"` or a custom `h-6`/`h-7` with `text-xs`; `icon` for square icon buttons.

## Tokens and scale

- **Colours: tokens only.** `bg-background` (page), `bg-sidebar` (app shell), `bg-card` (cards/tiles), `bg-accent` / `bg-secondary` (hover, selected, inputs), `bg-popover`, `border-border` / `border`, `text-foreground`, `text-muted-foreground` (meta), `text-primary` / `bg-primary` (accent colour), `text-success`, `text-destructive`, `bg-internal`/`border-internal-border` (internal-only content). Translucent tints are fine (`bg-primary/10`, `bg-success/10`). No Tailwind palette colours (`zinc`, `gray`, `blue-500`…), no hex. User-chosen colours (labels, releases, categories) come from the data via `style` (see `extractHslValues` in `@repo/util`).
- **Type scale:** dense UI is `text-xs` (toolbars, panel rows, pills, meta) and `text-sm` (body in lists and cards). Page titles are `text-2xl` bold. Long-form content uses the prose classes.
- **Radius:** chips and small buttons `rounded-lg`/`rounded-xl` (Button `primary` is `rounded-xl`), cards and tiles `rounded-xl`.
- **Icons:** `size-4` inside default Buttons (the Button forces `[&_svg]:size-4`), `size-3`/`size-3.5` in tight `text-xs` meta lines.
- **Spacing:** `gap-*` on flex/grid parents, not margins between siblings. Panels pad themselves (`page-component`), so content rendered into a panel has an unpadded root.

## Gotchas

- **Global heading CSS beats utilities.** `globals.css` styles `h1`–`h4` outside any layer (`h1` = `text-4xl font-extrabold`, `h2` = `text-3xl`, …), so `className="text-lg"` on an `<h2>` does nothing. Either use `Label variant="heading"`/`"subheading"` for UI headings, or force with `!` (`font-bold! text-2xl!`). Rich-text headings are capped by `PROSE_HEADINGS` (`components/public/portal/post/prose.ts`).
- **Base UI, not Radix: use `render`, not `asChild`.** `@repo/ui`'s menus, popovers, tooltips, dialogs and Button are Base UI. `<DropdownMenuTrigger asChild><Button/></DropdownMenuTrigger>` doesn't merge; Base UI renders its own unstyled `<button>` around yours. You get a button inside a button and centered content. Write `<DropdownMenuTrigger render={<Button …>…</Button>} />`. Exceptions that really implement `asChild`: `ComboBoxTrigger`, `TileTitle`/`Tile`, vaul `DrawerTrigger`. Older code still has the wrong pattern (tracked as SAY-92); don't copy it.
- **`TileTitle asChild` + `Label` is sized by `TileTitle`**, so a `text-xs` on the `Label` loses. Existing panels accept that size; match the sibling rather than fighting it.
- **Popup layering is solved centrally.** Body-portalled popups sit at `z-[10050]` on their Positioner (above drawers at 10010/10020 and the header at 9999). Don't add z-indexes at call sites; if something renders behind a drawer, see `page-component`.
- **Theme for dark and light.** Tokens handle both; anything hard-coded will break one of them.

## Rules

1. Compose `@repo/ui` / app components; only add layout utilities yourself.
2. No new design tokens, theme blocks, or parallel component layers (`Portal*`, `My*Card`) for one area.
3. Colours from tokens or from the data's own colour; never palette classes or hex.
4. Keep classNames inline on the element that renders them (no className maps in const/config files), as in AGENTS.md "Component Structure".
5. Match the nearest sibling screen's components, sizes and spacing exactly, and check it side by side when done.
6. Base UI triggers take `render`, not `asChild`.
7. Run Biome from inside the app/package directory on the files you touched (AGENTS.md).
