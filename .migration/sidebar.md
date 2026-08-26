# sidebar

2026-08-26. Legacy style (`style: "default"`, no `base-default` counterpart) — classification-only path:
fetched `https://ui.shadcn.com/r/styles/default/sidebar.json` as a radix-golden reference purely to detect
customizations, then hand-transformed the project's own file with the transformation engine
(`universal-patterns.md`, `wrapper-shapes.md`), preserving every existing class string exactly. Also updated
this file's own call sites into Wave A/B's already-migrated `button`/`tooltip` APIs. Verdict: clean — zero
remaining errors, zero remaining radix imports, no consumer breakage (nothing in the repo currently imports
this wrapper).

## Changed

`packages/ui/src/components/sidebar.tsx` — the only file touched.

- **Import swap** (line 3-4): removed `import { Slot } from "@radix-ui/react-slot";`, added
  `import { mergeProps } from "@base-ui/react/merge-props";` and
  `import { useRender } from "@base-ui/react/use-render";`.
- **`SidebarProvider`** (line 113): `<TooltipProvider delayDuration={0}>` → `<TooltipProvider delay={0}>` — call
  into Wave A/B's migrated tooltip wrapper, which renamed the prop per `universal-patterns.md`.
- **`SidebarGroupLabel`** (line 365): manual Slot idiom (`const Comp = asChild ? Slot : "div"`) → `useRender` +
  `mergeProps`, `defaultTagName: "div"`. Non-button polymorphic component, so per `universal-patterns.md`'s
  worked example this is the useRender/mergeProps path, not the Button primitive. Dropped `forwardRef`
  (`useRender.ComponentProps<"div">` already carries `ref` via `ComponentPropsWithRef`), matching the
  no-forwardRef convention already used by this repo's other useRender migrations (`breadcrumb.tsx`,
  `button-group.tsx`). All classes preserved verbatim; only `data-sidebar="group-label"` moved into the
  `mergeProps` literal (cast `as React.ComponentProps<"div">` per the mandatory data-* cast rule).
- **`SidebarGroupAction`** (line 384): same transform, `defaultTagName: "button"`. Classes unchanged.
- **`SidebarMenuButton`** (line 444): same transform, `defaultTagName: "button"`, plus the extra `isActive`,
  `variant`, `size`, `tooltip` props carried through as before. Two changes in one component:
  1. Own asChild → `useRender`/`mergeProps` (was `const Comp = asChild ? Slot : "button"`).
  2. Its internal tooltip-wrapping call site: `<TooltipTrigger asChild>{button}</TooltipTrigger>` →
     `<TooltipTrigger render={button} />`, matching the pattern already used in the migrated `button.tsx`
     (`<TooltipTrigger render={buttonElement} />`). `button` itself is now the `useRender` return value
     (a `React.ReactElement`), which is exactly what `render` expects.
  Dropped `forwardRef` for the same reason as above.
- **`SidebarMenuAction`** (line 491): same transform, `defaultTagName: "button"`, `showOnHover` kept as an
  explicit non-DOM prop destructured before `...props`. Classes (including the `showOnHover &&` conditional
  class string) unchanged.
- **`SidebarMenuSubButton`** (line 596): same transform, `defaultTagName: "a"`, `size`/`isActive` kept as
  explicit custom props and folded into the `mergeProps` literal as `data-size`/`data-active` (mirrors the
  original's manual `data-size={size} data-active={isActive}` on the Slot/`"a"` element). Classes unchanged.
- All other exports (`Sidebar`, `SidebarTrigger`, `SidebarRail`, `SidebarInset`, `SidebarInput`,
  `SidebarHeader`, `SidebarFooter`, `SidebarSeparator`, `SidebarContent`, `SidebarGroup`,
  `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuBadge`, `SidebarMenuSkeleton`,
  `SidebarMenuSub`, `SidebarMenuSubItem`, `useSidebar`) had no Radix/asChild surface and are untouched.

Leftover scan on this file, clean:
```
$ grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/sidebar.tsx
(no matches)
```

## Left alone

- **Golden-diff drift not related to Radix, deliberately not replayed**: diffing the fetched
  `styles/default/sidebar.json` against this file (import paths normalized) showed two categories of
  difference, neither of which is a customization to preserve/replay and neither of which was touched:
  1. Tailwind v3→v4 arbitrary-value syntax the project had already adopted independently of this migration
     (e.g. golden's `w-[--sidebar-width]` vs the project's `w-(--sidebar-width)`; golden's
     `theme(spacing.4)` vs the project's `--spacing(4)`; golden's `!p-0` suffix-less `!` vs the project's
     `p-0!`; golden's arbitrary-selector `[[data-side=left]_&]:` vs the project's `in-data-[side=left]:`).
     Purely a Tailwind version difference, out of scope for a Radix→Base migration.
  2. A `useCallback`/`useMemo` dependency-array completeness difference (golden includes `setOpenMobile` in
     `toggleSidebar`'s deps and `contextValue`'s deps; the project's file omits it) — pre-existing lint drift,
     unrelated to Radix, not touched per the no-scope-creep rule.
  No functional/behavioral customizations were found; every Radix/asChild/TooltipProvider usage matched the
  golden 1:1, so nothing needed replaying beyond the mechanical primitive swap.
- `apps/start/src/components/admin/sidebars/*.tsx` and `apps/start/src/components/public/side.tsx` import a
  **different, unrelated** component — `@repo/ui/components/doras-ui/sidebar` — not this file. Nothing in the
  repo currently imports `@repo/ui/components/sidebar` (confirmed via grep), so there is no consumer sweep to
  do for this wave. `doras-ui/sidebar.tsx` has its own pre-existing Radix/asChild usage and its own pre-existing
  tsc errors (5, from an `asChild`/`delayDuration` surface identical in shape to this file's) — explicitly out
  of scope; not touched.
- `input.tsx` and `skeleton.tsx` (imported by this file) carry no Radix; untouched as expected.

## Behavior changes

None. `TooltipTrigger`'s `asChild` → `render={button}` and the internal Slot→useRender swaps are drop-in
replacements with identical rendered output (same tag, same classes, same data attributes). No prop was
dropped from the public API of any exported component — `asChild` is gone from all five call sites but
`render` is the direct successor with the same "swap the underlying element" semantics, so any future
consumer wiring these up will use `render={<X/>}` in place of `asChild` + child, per `consumer-props.md`.

## Verify by hand

1. Toggle the sidebar (keyboard shortcut Cmd/Ctrl+B, and the trigger button) — confirm expand/collapse still
   animates and the `data-state`/`data-collapsible` attributes still drive the same Tailwind classes.
2. Hover a collapsed-state `SidebarMenuButton` that has a `tooltip` prop — confirm the tooltip still appears
   only when `state === "collapsed"` and not on mobile (the `hidden={state !== "collapsed" || isMobile}` logic
   is unchanged, but worth a visual check since it now flows through `render` instead of `asChild`).
3. Any `SidebarMenuButton`/`SidebarGroupLabel`/`SidebarGroupAction`/`SidebarMenuAction`/`SidebarMenuSubButton`
   used with a custom element (once a consumer exists) must pass `render={<X/>}` instead of
   `asChild><X/></...>` — sanity-check the rendered DOM node is the custom element, not a wrapping `<button>`/
   `<a>`/`<div>`.
4. Mobile sidebar (`Sheet`-based) open/close still works — this path is untouched but depends on the already-
   migrated `sheet.tsx`.

---

Derived status (scanned `packages/ui/src/components/` for `@radix-ui`/`radix-ui` imports after this run):
`tasks/data-table-faceted-filter.tsx`, `tasks/team-switcher.tsx`, `tasks/data-table-view-options.tsx`,
`tasks/data-table-pagination.tsx` still import Radix — **4 files remain** (this run only touched
`sidebar.tsx`; an `alert-dialog.tsx` in-progress change visible in `git status` belongs to a different,
concurrent task and was not made or reviewed here).
