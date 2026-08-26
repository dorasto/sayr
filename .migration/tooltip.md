# tooltip

2026-08-26. Legacy style (`default`, base `radix`, no `base-default` counterpart) — classification-only against the radix golden (`https://ui.shadcn.com/r/styles/default/tooltip.json`), then hand-transformed via the transformation engine (universal-patterns.md, overlays.md, class-mapping.md, wrapper-shapes.md). File is CUSTOMIZED vs golden (own colors, `sideOffset=0` default, `TooltipProvider` wraps every `Tooltip` instance, custom diamond arrow) — customizations preserved verbatim, only the Radix primitives rewired to Base UI.

## Changed

- `packages/ui/src/components/tooltip.tsx` — full rewrite:
  - Import: `import * as TooltipPrimitive from "@radix-ui/react-tooltip"` → `import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"`.
  - `TooltipProvider`: `delayDuration` prop → `delay` (Base UI rename); kept the project's `= 0` default and `data-slot="tooltip-provider"`.
  - `Tooltip`, `TooltipTrigger`: bare rewires, prop types switched from `React.ComponentProps<typeof X.Part>` to the Base UI idiom `TooltipPrimitive.Part.Props` (per universal-patterns.md).
  - `TooltipContent`: restructured `Portal > Content` → `Portal > Positioner > Popup` (line 33-51). `sideOffset` (kept default `0`), plus `side`, `align`, `alignOffset` are now destructured from the merged `Popup.Props & Pick<Positioner.Props, ...>` type and explicitly forwarded to `<TooltipPrimitive.Positioner>` (positioner-props-are-forward rule) — previously these lived directly on Radix's `Content` and would have silently landed on the wrong node (`Popup`) if left in `...props`.
  - `Positioner` gets `className="isolate z-50"` per wrapper-shapes.md convention.
  - Content class list: `data-[state=open]:animate-in` / `data-[state=closed]:animate-out` / `data-[state=closed]:fade-out-0` / `data-[state=open]:fade-in-0` / `data-[state=closed]:zoom-out-95` / `data-[state=open]:zoom-in-95` → re-keyed to `data-open:` / `data-closed:` (confirmed against the live base-nova golden registry pair — Base UI keeps the `animate-in`/`fade-in-0`/`zoom-in-95` utilities, it only swaps the state selector, contrary to the more general "restate as data-starting-style transitions" guidance in class-mapping.md; the per-family golden pair is ground truth). `data-[side=...]:slide-in-from-*` selectors unchanged (still parameterized, unaffected by the Base UI rename).
  - `origin-(--radix-tooltip-content-transform-origin)` → `origin-(--transform-origin)` per class-mapping.md CSS var table.
  - Arrow: kept the project's custom diamond design (`bg-accent fill-accent ... rotate-45 rounded-[2px]`) unchanged — this is a deliberate customization, not the base registry's per-side-offset arrow shape, so it was left as-is (only the surrounding primitives were rewired).
- Leftover sweep: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" tooltip.tsx` → clean (no matches).

## Left alone

- No other files in this component's own tree needed changes (single-file wrapper, no radix-specific sub-parts left behind).

## Behavior changes

- **Consumer API break (expected, out of batch scope):** `TooltipProvider`'s `delayDuration` prop is renamed to `delay`, and `TooltipTrigger` no longer accepts `asChild` (replace with `render`). This is mandated by the Base UI primitive itself, not a stylistic choice. It currently breaks 8 consumer files in `packages/ui` (unrelated to this batch, not touched): `button.tsx`, `sidebar.tsx`, `doras-ui/clipboard.tsx`, `doras-ui/sidebar.tsx`, `tomui/input-clipboard.tsx` (x2 call sites), `tomui/simple-clipboard.tsx`, `tomui/split-dialog.tsx`, `tomui/tabbed-dialog.tsx` (x2 call sites) — all still passing `delayDuration={...}` and/or `asChild` to `<TooltipProvider>`/`<TooltipTrigger>`. These need a `consumer-props.md`-driven sweep in a later wave; flagged here, not fixed.
- Tooltip enter/exit now uses Base UI's `data-open`/`data-closed` presence attributes instead of Radix's `data-state=open|closed` — purely a selector rename, same visual animation.

## Verify by hand

- Hover a trigger: tooltip should fade/zoom in after the provider's `delay` (0ms, unchanged), positioned on the correct side with the diamond arrow pointing at the trigger.
- Move the pointer to an adjacent tooltip trigger quickly: should reopen near-instantly (delay-group/`timeout` behavior), matching the old `skipDelayDuration` feel.
- Keyboard: focus a trigger via Tab — tooltip should open; Escape should dismiss it.
- Resize the viewport near an edge to confirm collision handling still flips `side`/`align` and the arrow classes (`data-[side=...]`) still track it correctly.
