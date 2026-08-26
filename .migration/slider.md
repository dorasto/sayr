# slider

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/slider.json`) + hand transform via the transformation engine. Verdict: pristine (matches golden byte-for-byte modulo the import alias), migrated in place; anatomy restructured per `form-controls.md`/`universal-patterns.md` (new required `Control` part).

## Changed

- `packages/ui/src/components/slider.tsx`
  - Classification: diffed clean against the "default"-style golden (only the `@repo/ui/lib/utils` vs `@/lib/utils` import-alias difference) — pristine.
  - `import * as SliderPrimitive from "@radix-ui/react-slider"` → `import { Slider as SliderPrimitive } from "@base-ui/react/slider"` (line 3).
  - Anatomy restructured per `form-controls.md`: Radix `Root > Track > (Range, Thumb)` → Base UI `Root > Control > Track > (Indicator, Thumb)`. `Control` is a new required part (the clickable/draggable pointer-interaction surface; Radix's `Root` did that job itself). `Range` renamed to `Indicator`.
  - Added `thumbAlignment="edge"` on `Root` — per `universal-patterns.md`/`form-controls.md`, Base UI's slider defaults `thumbAlignment` to `'center'` (thumb center aligns with the track edge at min/max, so half the thumb can hang off the end); Radix always behaved like `'edge'` (thumb stays fully inside the track bounds). Set explicitly to preserve the original visual behavior.
  - Classes: Root/Track/Indicator/Thumb classes kept unchanged from the original (`relative flex w-full touch-none select-none items-center`, `relative h-2 w-full grow overflow-hidden rounded-full bg-secondary`, `absolute h-full bg-primary`, thumb styling); one new wrapper (`Control`) was given a minimal `"relative flex w-full items-center"` class purely as a structural pass-through (Base UI has no equivalent radix class to inherit here since `Control` didn't exist before), and Thumb's `disabled:pointer-events-none disabled:opacity-50` → `data-disabled:pointer-events-none data-disabled:opacity-50` (Base UI Thumb renders a `<div>` with a nested `<input type="range">`, not a directly-disabled element, per `class-mapping.md`'s element-change rule).
  - Dropped `React.forwardRef` wrapper. Base UI's `Slider.Root` is a **generic function component** that accepts `ref` as a normal React-19-style prop (`<Value extends number | readonly number[]>(props: SliderRoot.Props<Value> & { ref?: React.Ref<HTMLDivElement> }) => JSX.Element`), not a `ForwardRefExoticComponent` — verified against `slider/root/SliderRoot.d.ts`. `React.ElementRef<typeof SliderPrimitive.Root>` does not reliably resolve against that shape, so the wrapper is now a plain function component typed `React.ComponentProps<typeof SliderPrimitive.Root>` (which already includes `ref` in its prop type); `ref` still passes through transparently via `{...props}`. Also dropped the `displayName` assignment, which only applies to `forwardRef`/class components.
- Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/slider.tsx` → clean.

## Left alone

Nothing else needed touching in this file.

## Behavior changes

- **`onValueCommit` renamed to `onValueCommitted`** (Base UI, per `form-controls.md`) — no consumer of this wrapper was touched (out of scope), but any existing `<Slider onValueCommit={...}>` call site will now fail to type-check and needs the rename plus the new `(value, eventDetails)` signature.
- **Commit-vs-change semantics unchanged at the primitive level**, but worth flagging explicitly since it's a common gotcha: Base UI still fires `onValueChange` continuously during drag/keyboard interaction and `onValueCommitted` only once interaction ends (same two-callback model as Radix's `onValueChange`/`onValueCommit`) — not a regression, just re-confirming it wasn't silently collapsed into one event.
- Removed the `React.forwardRef` wrapper (see above) — functionally equivalent under React 19's ref-as-prop model, but `ref` is no longer statically typed as `HTMLDivElement` via `ElementRef` inference the way it was before; it now flows through the wider `SliderRoot.Props<Value>` ref type. Not expected to break any current usage.

## Verify by hand

1. Drag the thumb along the track; confirm the filled `Indicator` bar tracks the thumb position and the thumb visually stays fully within the track bounds at both min and max (this is what `thumbAlignment="edge"` should preserve).
2. Click directly on the track at a random point; confirm the thumb jumps there (Control's pointer handling).
3. Tab to the thumb, use arrow keys / Page Up/Down; confirm keyboard stepping works.
4. If any consumer uses `onValueCommit`, confirm it was flagged and updated separately (not fixed here, out of batch scope).
