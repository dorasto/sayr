# separator

Legacy style (`default`), engine transform. Golden radix reference fetched from
`https://ui.shadcn.com/r/styles/default/separator.json` for classification only.
Verdict: pristine (only trivial difference from golden: project uses `h-px`/`w-px`
Tailwind shorthand vs golden's `h-[1px]`/`w-[1px]` arbitrary values — identical computed
CSS) — primitive rewire only, no class changes.

## Changed

- `src/components/separator.tsx`:
  - Import swapped: `import * as SeparatorPrimitive from "@radix-ui/react-separator"` ->
    `import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"`.
  - `SeparatorPrimitive.Root` -> callable `SeparatorPrimitive` (single-part primitive,
    per universal-patterns.md's callable-primitive rule; Base UI's separator export has
    no `.Root`).
  - Dropped the `decorative` prop and its `= true` default — Base UI's separator has no
    `decorative` prop (coverage matrix: "dropped"; it's always semantic, always
    `role="separator"`). Confirmed via repo-wide grep that no consumer passes
    `decorative` to this component, so this is a clean drop with zero call-site impact.
  - Type signature: `React.ElementRef<typeof SeparatorPrimitive>` /
    `React.ComponentPropsWithoutRef<typeof SeparatorPrimitive>` (was `.Root`-qualified
    before; same shape, unqualified now since the export is directly callable).
  - `.displayName = SeparatorPrimitive.Root.displayName` -> literal `"Separator"`.
  - Classes untouched: `shrink-0 bg-border` + `h-px w-full` / `h-full w-px` by
    orientation — no data-attribute selectors were in use.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/separator.tsx` ->
    clean.

## Left alone

None — single file in scope.

## Behavior changes

- `decorative` prop removed from the public API. Previously defaulted to `true`
  (`aria-orientation` suppressed, `role="none"`); Base UI's separator is always
  `role="separator"` with no opt-out. No consumer in the repo used this prop, so no
  observed regression, but flagging per SKILL.md's "no Base UI counterpart" behavior for
  dropped props.

## Verify by hand

- Render a horizontal and a vertical `<Separator />` (default and `orientation="vertical"`):
  both should render a thin line, full-width or full-height respectively.
- Inspect the DOM: element should carry `role="separator"` and `data-orientation`.
