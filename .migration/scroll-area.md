# scroll-area

Legacy style (`default`), engine transform. Golden radix reference fetched from
`https://ui.shadcn.com/r/styles/default/scroll-area.json` for classification only.
Verdict: pristine (only trivial difference from golden: project uses `p-px` Tailwind
shorthand vs golden's `p-[1px]` arbitrary value — identical computed CSS) — primitive
rewire + part renames only, no class changes.

## Changed

- `src/components/scroll-area.tsx`:
  - Import swapped: `import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"`
    -> `import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"`.
  - `ScrollAreaPrimitive.Root` / `.Viewport` / `.Corner` unchanged (direct mapping).
  - `ScrollAreaPrimitive.ScrollAreaScrollbar` -> `ScrollAreaPrimitive.Scrollbar` (part
    rename per the coverage matrix: "ScrollArea | direct (Scrollbar/Thumb renames)").
  - `ScrollAreaPrimitive.ScrollAreaThumb` -> `ScrollAreaPrimitive.Thumb`.
  - `.displayName = ScrollAreaPrimitive.Root.displayName` /
    `ScrollAreaPrimitive.ScrollAreaScrollbar.displayName` -> literal `"ScrollArea"` /
    `"ScrollBar"`.
  - Classes untouched (`relative overflow-hidden`, viewport's `h-full w-full
    rounded-[inherit]`, scrollbar's orientation-conditional sizing, thumb's `relative
    flex-1 rounded-full bg-border`) — no data-attribute selectors were in use, so
    nothing needed class-mapping rewrites.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/scroll-area.tsx` ->
    clean.

## Left alone

None — single file in scope.

## Behavior changes

- Dropped props (not used by this wrapper, but noting per the coverage table since they
  existed on radix's `Root`): `type` (`"auto"|"always"|"scroll"|"hover"`, visibility is
  now CSS-driven off `[data-hovering]`/`[data-scrolling]`/`[data-has-overflow-x/y]`
  instead), `scrollHideDelay`, `dir`, `nonce`. This wrapper's `ScrollArea`/`ScrollBar`
  don't expose or forward any of these explicitly (they're bare `{...props}` spreads),
  so any consumer passing them would now silently no-op rather than error — no consumer
  in the repo passes any of these (grep found none).
- Scrollbar's old `[data-state="visible"|"hidden"]` selector is gone in Base UI (replaced
  by `[data-hovering]`/`[data-scrolling]`/`[data-has-overflow-*]`); this wrapper's
  `ScrollBar` doesn't style on that attribute today, so no visible change.

## Verify by hand

- Render a `ScrollArea` with overflowing content, vertical and horizontal: scrollbar
  appears and thumb tracks scroll position correctly.
- Drag the thumb: content scrolls.
- Resize content to fit (no overflow): scrollbar disappears/doesn't mount.
