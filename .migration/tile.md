# doras-ui/tile

Custom project component (not a shadcn registry item — no golden pair exists to classify
against). Engine transform: rewired the `@radix-ui/react-slot` `asChild` idiom used by
all six exported parts (`Tile`, `TileHeader`, `TileIcon`, `TileTitle`,
`TileDescription`, `TileAction`) onto Base UI's `useRender` + `mergeProps`.

## Changed

- `src/components/doras-ui/tile.tsx`:
  - Import swapped: `import { Slot } from "@radix-ui/react-slot"` ->
    `import { mergeProps } from "@base-ui/react/merge-props"` +
    `import { useRender } from "@base-ui/react/use-render"`.
  - **Deliberate deviation from the standard `asChild -> render` rename** (documented in
    universal-patterns.md's worked example): kept the public `asChild: boolean` prop
    name on all six parts instead of renaming to Base UI's `render` prop. Internally,
    each part now calls `useRender({ defaultTagName, render: asChild ? children : undefined,
    props: mergeProps(...) })` — when `asChild` is true, the existing single child
    element is passed as `render` (same semantics as the old `Slot` swap); when false,
    `children` flows through `props` normally. This is Base UI-backed under the hood
    (no more `@radix-ui/react-slot`) while keeping the exact call-site shape
    (`<TileTitle asChild><a>...</a></TileTitle>`) working unchanged.
    Reason: `Tile`/`TileTitle`/`TileDescription`/`TileAction`/`TileIcon` are used with
    `asChild` at ~24 call sites across `apps/start/src` (e.g.
    `apps/start/src/components/tasks/task/task-content.tsx:84,108,162`,
    `apps/start/src/components/pages/admin/settings/orgId/root/index.tsx:401,458,497,561`,
    `apps/start/src/components/public/task-item.tsx:44`, and 15+ more) — all outside this
    batch's file list. Renaming to `render` per the standard pattern would have broken
    every one of them; SKILL.md's stated goal is "keeping the project buildable at every
    step," and a consumer-wide sweep of a custom (non-registry) component's prop rename
    is a separate, much larger task than this wrapper wave. Flagging this explicitly
    rather than silently picking one approach.
  - `TileHeader`'s icon/other-children separation logic (`React.Children.toArray` +
    `find`/`filter` on `child.type === TileIcon`) preserved exactly; when `asChild` is
    true the composed icon/wrapper structure is bypassed (same as the original — the old
    code also didn't apply the icon-separation when `asChild` was set, since `Comp`
    always got `{tileIcon}{wrapper}` as children regardless... actually see Behavior
    changes below for a correction to this point).
  - `TileContext` (variant threading for `TileIcon`'s border/bg styling) unchanged.
  - `tileVariants` (cva) unchanged.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/doras-ui/tile.tsx`
    -> clean.

## Left alone

None — single file in scope. (`Tile`/`TileHeader`/etc. consumers across `apps/start` are
untouched, per the "don't touch files outside your batch" instruction — see the flagged
deviation above for why.)

## Behavior changes

- **`TileHeader` + `asChild` combination**: the original radix implementation, when
  `asChild` was true, still passed the *composed* children (icon + wrapper div) into
  `Slot`, which would then clone them onto the single child element found via
  `React.Children.only`-style slotting — in practice this combination was fragile/
  unlikely to have been used correctly before either (`Slot` expects exactly one child
  element, but `TileHeader` always produces two: the optional icon plus the wrapper div).
  The new version: when `asChild` is true, `render` gets the *raw* `children` (bypassing
  icon separation entirely) rather than the composed icon+wrapper output — this is the
  more defensible interpretation of "render as this element" and matches how `useRender`
  is meant to be used (one element to render into), but flagging since it's a semantic
  judgment call for an edge case with no observed real usage (grep found no
  `<TileHeader asChild>` call sites in the repo today).
- All other parts: no observed behavior change — `asChild` semantics (single child
  becomes the rendered element, with the wrapper's classes/props merged onto it) are
  preserved via `useRender`'s `render` prop taking the place of `Slot`.

## Verify by hand

- Render `<Tile>...</Tile>` (no asChild): renders a styled `<div>` as before.
- Render `<TileTitle asChild><a href="/foo">Title</a></TileTitle>`: should render as an
  `<a>` tag with the title's `font-medium text-base` classes merged onto it (not a
  wrapping `<div>` around the `<a>`).
- Render `<TileDescription asChild><span>...</span></TileDescription>` similarly.
- `TileIcon` inside a `variant="outline"` Tile: icon wrapper gets `border` instead of
  `bg-accent` (context threading still works).
- Spot-check 2-3 of the real `asChild` call sites listed above in the running app
  (`task-content.tsx`, `settings/orgId/root/index.tsx`) to confirm no visual regression.
