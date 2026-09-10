# timeline

2026-08-26. Hand-rolled radix usage (not a shadcn ui-wrapper, lives in `tomui/`), transformation engine only — `Slot`/asChild -> `render`/`useRender`+`mergeProps`, per `universal-patterns.md`'s worked example. Small, contained change; one function affected. Verdict: migrated.

## Changed

- `packages/ui/src/components/tomui/timeline.tsx`:
  - Import swapped: `import { Slot } from "radix-ui"` (unified meta-package form) -> `import { mergeProps } from "@base-ui/react/merge-props"` + `import { useRender } from "@base-ui/react/use-render"`.
  - `TimelineDate` (line ~76): the manual Slot idiom (`const Comp = asChild ? Slot.Root : "time"`, `TimelineDateProps extends React.HTMLAttributes<HTMLTimeElement> { asChild?: boolean }`) was rewritten to the `useRender` + `mergeProps` pattern from `universal-patterns.md`'s worked example:
    - Props type: custom `TimelineDateProps` interface (with `asChild`) -> `useRender.ComponentProps<"time">` (brings in `render` instead of `asChild`, default tag `"time"` preserved via `defaultTagName: "time"`).
    - `data-slot="timeline-date"` and the original `className` string (`"text-muted-foreground mb-1 block text-xs font-medium group-data-[orientation=vertical]/timeline:max-sm:h-4"`, unchanged verbatim) moved into the `mergeProps<"time">` object literal, cast `as React.ComponentProps<"time">` per the documented pitfall (raw `data-*` keys in an object literal fail `mergeProps`'s excess-property check without the cast).
  - No other function in the file touched: `TimelineIndicator` also declares an `asChild` prop, but it was already dead code in the original (never used to switch the rendered element — always renders a plain `<div>`), does not reference `Slot`, and is not a radix usage — left as-is, out of scope for this migration.

Leftover scan, both target files, clean (no matches):
```
grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/tomui/timeline.tsx
grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/toggle-group.tsx
```

## Left alone

- `TimelineIndicator`'s unused `asChild` prop (see above) — pre-existing dead code unrelated to Radix/Slot, not touched.
- No cmdk/vaul/sonner/input-otp/react-day-picker/recharts usage in this file — nothing to report there.

## Behavior changes

None. `TimelineDate` is a non-button polymorphic component (a `<time>` element), so it lands squarely in the `useRender`/`mergeProps` pattern (not the real `Button` primitive path), and that pattern is a drop-in behavioral match for the old `asChild`/`Slot.Root` idiom — same default tag, same merged `data-slot`/`className`, same prop passthrough.

## Verify by hand

1. Render `<TimelineDate>2026-01-01</TimelineDate>` with no `render` prop — confirm it still renders a `<time data-slot="timeline-date" class="...">` element with the original classes intact.
2. Render `<TimelineDate render={<span />}>...</TimelineDate>` — confirm it renders a `<span>` (not `<time>`) with `data-slot="timeline-date"` and the merged className still applied, matching the old `asChild` + custom child behavior.
3. Sanity-check within a full `Timeline` (`orientation="vertical"`/`"horizontal"`) that `TimelineDate`'s responsive class (`group-data-[orientation=vertical]/timeline:max-sm:h-4`) still reacts to the parent's `data-orientation`, since that attribute/selector wiring lives in `Timeline`/`TimelineItem`, untouched by this change.
