# button

2026-08-26. Legacy style (`default`) — classification-only against the
`ui.shadcn.com/r/styles/default/button.json` radix golden, then hand-transformed
the project's own file via the transformation engine. Verdict: migrated to the
real `@base-ui/react/button` primitive; `asChild` is gone, `render` (inherited
from the primitive) is the new polymorphism API; the cva variant/size setup is
untouched byte-for-byte; tooltip integration rewired to the already-migrated
`tooltip.tsx`.

## Changed

- `packages/ui/src/components/button.tsx`
  - Classified against golden: the project's file is heavily customized versus
    the stock `default` style — extra `variant`s (`accent`, `primary`,
    `success`), different `outline`/`ghost` shades, `rounded-lg` instead of
    `rounded-md`, a `cursor-pointer` utility, a plain-ring focus style instead
    of `ring-2 ring-ring ring-offset-2`, `font-bold` on `default`/`lg`, and a
    whole `tooltipText`/`tooltipDelayDuration`/`tooltipSide` feature not
    present in the golden at all. None of this was replayed from the golden;
    the transform only rewires primitives/props, all classes and cva
    structure are preserved exactly as they were (line 8-36 unchanged).
  - Import (line 1): `import { Slot } from "@radix-ui/react-slot"` ->
    `import { Button as ButtonPrimitive } from "@base-ui/react/button"` — the
    real primitive, per the SKILL.md hard rule (never a hand-rolled
    `useRender` wrapper for `button.tsx`).
  - `ButtonProps` (line 38): dropped the hand-rolled `asChild?: boolean` and
    `extends React.ButtonHTMLAttributes<HTMLButtonElement>`; now `extends
    ButtonPrimitive.Props, VariantProps<typeof buttonVariants>` — `render`,
    `nativeButton`, and `focusableWhenDisabled` come in for free from the
    primitive's own prop surface.
  - Body (line 44-65): `const Comp = asChild ? Slot : "button"` removed;
    `buttonElement` now renders `<ButtonPrimitive>` directly with
    `{...props}` (which naturally carries a caller's `render` prop through,
    since it's now a real prop on `ButtonPrimitive.Props` instead of a custom
    boolean flag).
  - Tooltip integration rewired to match the now-migrated `tooltip.tsx` API:
    `<TooltipProvider delayDuration={...}>` -> `<TooltipProvider
    delay={...}>` (prop rename per `universal-patterns.md`); `<TooltipTrigger
    asChild>{buttonElement}</TooltipTrigger>` -> `<TooltipTrigger
    render={buttonElement} />` (asChild->render worked example from
    `universal-patterns.md`, self-closing since the render element already
    carries all its own content, matching the `select.tsx` `Icon
    render={<ChevronDownIcon .../>}` precedent already in this codebase).
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" packages/ui/src/components/button.tsx` -> no matches.

## Left alone

- `packages/ui/src/components/tooltip.tsx` — already migrated in Wave A;
  only consumed here, not touched.
- The 71 consumer files across `apps/start`, `packages/ui`, and
  `packages/integrations` that currently pass `asChild` to `<Button>` (e.g.
  `packages/ui/src/components/sidebar.tsx`,
  `packages/ui/src/components/doras-ui/clipboard.tsx`,
  `apps/start/src/components/auth/login.tsx`, and dozens more under
  `apps/start/src/components/**`). They will fail to typecheck against the
  new `ButtonProps` (no more `asChild`) until repointed to `render` —
  explicitly out of scope for this batch (Wave D consumer sweep), left
  untouched per instructions.

## Behavior changes

- **`tooltipDelayDuration` is currently inert.** The now-migrated `Tooltip`
  wrapper (`tooltip.tsx`) unconditionally self-wraps its `Root` in its own
  `<TooltipProvider>` with `delay = 0` by default:
  ```
  function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
    return (
      <TooltipProvider>
        <TooltipPrimitive.Root data-slot="tooltip" {...props} />
      </TooltipProvider>
    );
  }
  ```
  Because Base UI's tooltip delay lives only on `Provider` (not `Root` — no
  `delay` prop on `TooltipRoot.Props`), the innermost provider (the one
  `Tooltip` creates internally) wins over the outer
  `<TooltipProvider delay={tooltipDelayDuration}>` that `button.tsx` wraps
  around it. This was already true structurally the moment Wave A committed
  `tooltip.tsx`'s self-wrapping shape; `button.tsx`'s own change (the
  `delayDuration`->`delay` rename) is correct and necessary, but the delay
  value it passes has no effect through to the rendered tooltip. Flagged, not
  patched — fixing it would mean changing the already-migrated,
  already-committed `tooltip.tsx` (out of scope for this file pair; the
  outer `<TooltipProvider delay={tooltipDelayDuration}>` wrap is left in
  place since it costs nothing and documents intent, but is currently a
  no-op).
- Consumers using `asChild` will simply fail to typecheck (not a silent
  runtime behavior change) once this file lands — see "Left alone".
- No change to `buttonVariants` classes/defaults; visual output for the
  vanilla (non-`asChild`, non-tooltip) `<Button>` case is identical.

## Verify by hand

1. Render a plain `<Button>Save</Button>` — confirm same look (rounded-lg,
   bg-primary, font-bold) and click behavior as before.
2. Render `<Button tooltipText="Delete">...</Button>`, hover it — tooltip
   should still appear (confirms `render={buttonElement}` correctly merges
   trigger behavior onto the primitive button without a nested `<button>` in
   the DOM). Note per "Behavior changes" above: the delay before it appears
   will be Base UI's tooltip default (from `tooltip.tsx`'s inner provider),
   not whatever `tooltipDelayDuration` was passed.
3. Any consumer still passing `asChild` to `<Button>` will show a red
   squiggle / tsc error until repointed to `render` — expected until the
   consumer sweep wave lands.
