# popover

2026-08-26. Legacy style (`default`, base `radix`, no `base-default` counterpart) — classification-only against the radix golden (`https://ui.shadcn.com/r/styles/default/popover.json`), then hand-transformed via the transformation engine. File is CUSTOMIZED vs golden (`rounded-xl!`, own padding/width, exported `PopoverAnchor` for virtual-ref anchoring with an explanatory comment) — customizations preserved, only primitives rewired.

## Changed

- `packages/ui/src/components/popover.tsx` — full rewrite:
  - Import: `import * as PopoverPrimitive from "@radix-ui/react-popover"` → `import { Popover as PopoverPrimitive } from "@base-ui/react/popover"`.
  - `Popover = PopoverPrimitive.Root`, `PopoverTrigger = PopoverPrimitive.Trigger`: bare re-exports, unchanged shape.
  - `PopoverAnchor` (line 17-22): Base UI's Popover has **no Anchor part** (per overlays.md: "Anchor → Positioner `anchor` prop", and confirmed empty — no `anchor/` dir under `node_modules/@base-ui/react/popover`). Per the skill's hard rule ("Popover Anchor... have no equivalent: inert passthrough + flag"), turned into an inert passthrough: it still accepts `virtualRef` (typed to match the original Radix `virtualRef?: RefObject<{ getBoundingClientRect(): DOMRect }>` shape) so call sites keep compiling, but it renders `null` and no longer anchors anything. Documented in a code comment pointing at the one known caller.
  - `PopoverContent`: restructured `Portal > Content` → `Portal > Positioner > Popup`. `align` (kept default `"center"`) and `sideOffset` (kept default `4`) plus `side`/`alignOffset` are destructured from `Popup.Props & Pick<Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">` and explicitly forwarded to `<PopoverPrimitive.Positioner>` (forward rule). `ref` now attaches to `Popup` (was `Content`) — same rendered box, no behavior change for consumers reading the ref.
  - `Positioner` gets `className="isolate z-50"` per wrapper-shapes.md.
  - Class list: `data-[state=open]:animate-in` / `data-[state=closed]:animate-out` / `data-[state=closed]:fade-out-0` / `data-[state=open]:fade-in-0` / `data-[state=closed]:zoom-out-95` / `data-[state=open]:zoom-in-95` → `data-open:` / `data-closed:` re-key (matches the live base-nova golden's idiom); `data-[side=...]:slide-in-from-*` unchanged. `origin-(--radix-popover-content-transform-origin)` → `origin-(--transform-origin)`.
  - `displayName` switched from reading `PopoverPrimitive.Content.displayName` (no longer meaningful post-restructure) to a literal `"PopoverContent"` string.
- Leftover sweep: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" popover.tsx` → clean.

## Left alone

- No sibling files needed changes.

## Behavior changes

- **`PopoverAnchor` is now inert (real functional regression, flagged not silently patched).** The only known caller is `apps/start/src/components/generic/use-page.tsx` (`usePanelTrigger`, "anchored panel" popovers): it renders `<PopoverAnchor virtualRef={triggerRef} />` with **no** `<PopoverTrigger>` in the tree — the popover is fully controlled (`open`/`onOpenChange`) and anchored purely via a ref to an off-tree DOM element. With the passthrough dropped to `null`, this popover has no anchor and no trigger — it will very likely mis-position (viewport corner) or fail to position at all. **Fix required in a later wave**: give `PopoverContent`'s `Positioner` an `anchor` prop (Base UI: `Element | VirtualElement | RefObject<Element | null> | (() => ...) | null`) sourced from `triggerRef` directly, and delete the `<PopoverAnchor>` call site. `apps/start` is outside this batch's file list so it was not touched.
- **Consumer prop breaks (expected, out of batch scope).** `use-page.tsx` also passes `onOpenAutoFocus={(e) => e.preventDefault()}` and `onPointerDownOutside={(e) => ...}` to `PopoverContent` — both Radix-only callback props with no 1:1 Base UI equivalent (per overlays.md: `onOpenAutoFocus` → Popup `initialFocus`; `onPointerDownOutside` → Root `onOpenChange` reason `'outside-press'` + `eventDetails.cancel()`). These will now fail to type-check / silently no-op at that call site until swept.
- Enter/exit now keyed off `data-open`/`data-closed` instead of `data-state=open|closed` — same visual animation, selector rename only.

## Verify by hand

- Open a popover via its trigger: should fade/zoom in below the trigger (default `side="bottom"`, `align="center"`, `sideOffset=4`), dismiss on outside click and Escape, and return focus to the trigger on close.
- **Anchored panel popovers specifically** (`usePanelTrigger` in `apps/start`, any row-level "quick action" popover): open one and confirm it visually anchors correctly. If it appears at the top-left of the viewport or not at all, that confirms the flagged `PopoverAnchor` regression above — this needs the `apps/start` follow-up fix before this batch is considered fully safe to ship.
