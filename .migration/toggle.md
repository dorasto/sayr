# toggle

Legacy style (`default`), engine transform. Golden radix reference fetched from
`https://ui.shadcn.com/r/styles/default/toggle.json` for classification only (no replay).
Verdict: customized wrapper (extra `primary`/`secondary`/`accent` variants not in the
stock golden), migrated by hand onto Base UI's `@base-ui/react/toggle`, all custom
variants preserved verbatim.

## Changed

- `src/components/toggle.tsx`:
  - Import swapped: `import * as TogglePrimitive from "@radix-ui/react-toggle"` ->
    `import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"`.
  - `TogglePrimitive.Root` -> callable `TogglePrimitive` (single-part primitive, per
    universal-patterns.md's callable-primitive rule).
  - `data-[state=on]:` -> `data-pressed:` in `toggleVariants` (base class list plus the
    `primary`/`secondary` variants that reference the pressed state).
  - Type signature changed from `React.ElementRef<typeof TogglePrimitive.Root>` /
    `React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>` to
    `React.forwardRef<HTMLButtonElement, TogglePrimitive.Props & VariantProps<...>>`
    (Base UI's `Toggle` is a generic function component, not a `ForwardRefExoticComponent`,
    so `ElementRef`/`ComponentPropsWithoutRef` don't resolve against it; used the
    namespace's `.Props` type instead, per universal-patterns.md's
    `React.ComponentProps<typeof X.Part> -> X.Part.Props` rule).
  - `Toggle.displayName = TogglePrimitive.Root.displayName` -> literal `"Toggle"` (no
    `.displayName` static on the Base UI export in a form usable here).
  - `disabled:` classes kept as-is (Toggle still renders a native `<button>`, so the
    pseudo-class variant remains valid — no `aria-disabled:` substitution needed here).
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/toggle.tsx` -> clean.

## Left alone

- No other files in scope for this component. `toggle-group.tsx` and `button-group.tsx`
  import this file but are explicitly a later wave (per task instructions) — not touched.

## Behavior changes

None. `data-pressed` is a straight rename of `data-[state=on]`; no default/prop
behavior shifted.

## Verify by hand

- Click a Toggle (default/outline/primary/secondary/accent variants): pressed state
  should apply `data-pressed` styling (bg/text swap) identically to the old
  `data-[state=on]` look.
- Tab to a toggle, press Space/Enter: toggles pressed state.
- Disabled toggle: pointer-events and opacity dimmed, not focusable-and-actionable.
