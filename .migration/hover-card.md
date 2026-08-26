# hover-card

2026-08-26. Legacy style (`default`, base `radix`, no `base-default` counterpart) — classification-only against the radix golden (`https://ui.shadcn.com/r/styles/default/hover-card.json`), then hand-transformed via the transformation engine. File is CUSTOMIZED vs golden (own width/colors) — customizations preserved, only primitives rewired.

## Changed

- `packages/ui/src/components/hover-card.tsx` — full rewrite:
  - Import: `import * as HoverCardPrimitive from "@radix-ui/react-hover-card"` → `import { PreviewCard as HoverCardPrimitive } from "@base-ui/react/preview-card"` (Radix `HoverCard` is renamed `PreviewCard` in Base UI; per universal-patterns.md the public wrapper names stay `HoverCard*` — only the underlying import changes).
  - `HoverCard = HoverCardPrimitive.Root`, `HoverCardTrigger = HoverCardPrimitive.Trigger`, `HoverCardPortal = HoverCardPrimitive.Portal`: bare re-exports, unchanged shape. (`HoverCardPortal` remains defined-but-unexported, matching the pre-existing file — used internally, not part of the public export list; left as-is, not my call to change.)
  - `HoverCardContent`: restructured `Content` (which internally bundled positioning) → `Positioner > Popup`. `align` (kept default `"center"`) and `sideOffset` (kept default `4`) plus `side`/`alignOffset` destructured and forwarded to `<HoverCardPrimitive.Positioner>` (forward rule). `ref` now attaches to `Popup`.
  - `Positioner` gets `className="isolate z-50"` per wrapper-shapes.md.
  - Class list: `data-[state=open]:animate-in` / `data-[state=closed]:animate-out` / `data-[state=closed]:fade-out-0` / `data-[state=open]:fade-in-0` / `data-[state=closed]:zoom-out-95` / `data-[state=open]:zoom-in-95` → `data-open:` / `data-closed:`; `data-[side=...]:slide-in-from-*` unchanged. `origin-(--radix-hover-card-content-transform-origin)` → `origin-(--transform-origin)`.
  - `displayName` switched to a literal `"HoverCardContent"` string.
- Leftover sweep: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" hover-card.tsx` → clean.

## Left alone

- No sibling files needed changes.

## Behavior changes

- **Delay props move (expected, out of batch scope).** Radix's `HoverCard.Root` had `openDelay`/`closeDelay`; Base UI's `PreviewCard.Root` drops both — they move to `PreviewCard.Trigger` as `delay`/`closeDelay` (defaults `600`/`300`, close to Radix's `700`/`300`). This wrapper doesn't expose either prop itself (neither did the original), so most call sites are unaffected. One known break: `doras-ui/preview.tsx` passes `openDelay={...}` directly to the `HoverCard` root and `asChild` to `HoverCardTrigger` — both now fail to type-check (`openDelay` doesn't exist on `PreviewCard.Root.Props`; `asChild` doesn't exist on `PreviewCard.Trigger.Props`, replace with `render`). `doras-ui/preview.tsx` is outside this batch's file list and was not touched; flagged for the consumer-props sweep.
- Trigger element stays an `<a>` on both sides (Radix `HoverCard.Trigger` and Base UI `PreviewCard.Trigger` both render `<a>` by default) — no change there.
- Enter/exit now keyed off `data-open`/`data-closed` instead of `data-state=open|closed` — same visual animation, selector rename only.

## Verify by hand

- Hover a trigger and hold: card should fade/zoom in below-center after the (now Trigger-level) delay, and stay open while the pointer moves from trigger to card content (hoverable-popup behavior).
- Move the pointer away: card should close after the close delay.
- Confirm collision handling still flips `side`/`align` near a viewport edge and the `data-[side=...]` slide-in direction still tracks correctly.
