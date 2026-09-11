# progress

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/progress.json`) + hand transform via the transformation engine. Verdict: pristine (matches golden byte-for-byte modulo the import alias), migrated in place; anatomy restructured per `universal-patterns.md`'s coverage matrix ("new Track/Label/Value parts, no manual transform").

## Changed

- `packages/ui/src/components/progress.tsx`
  - Classification: diffed clean against the "default"-style golden (only the import-alias difference) — pristine.
  - `import * as ProgressPrimitive from "@radix-ui/react-progress"` → `import { Progress as ProgressPrimitive } from "@base-ui/react/progress"` (line 3).
  - Anatomy restructured: Radix `Root > Indicator` (with a manually computed `style={{ transform: 'translateX(-${100 - (value || 0)}%)' }}` on Indicator) → Base UI `Root > Track > Indicator`, with **no manual transform** — verified against `progress/indicator/ProgressIndicator.mjs`: Base UI's `ProgressIndicator` computes `width: ${percentageValue}%` itself from context, so the wrapper's old inline `style` prop was dropped entirely.
  - Added the new required `Track` part (`relative h-full w-full` — a plain structural wrapper since Track had no Radix equivalent to inherit classes from) between Root and Indicator.
  - Root/Indicator classes kept unchanged (`relative h-4 w-full overflow-hidden rounded-full bg-secondary`, `h-full w-full flex-1 bg-primary transition-all`).
  - `Progress.displayName` changed from `ProgressPrimitive.Root.displayName` (Radix static, gone) to the literal `"Progress"`.
  - Kept `React.forwardRef<React.ElementRef<...>, React.ComponentPropsWithoutRef<...>>` — Base UI's `ProgressRoot` **is** a real `ForwardRefExoticComponent<... RefAttributes<HTMLDivElement>>` (verified against `progress/root/ProgressRoot.d.ts`), unlike Slider/RadioGroup, so this pattern still resolves correctly and was left as-is.
- Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/progress.tsx` → clean.

## Left alone

Nothing else needed touching in this file.

## Behavior changes

- **`value` is now a required prop, and typed `number | null`** (Base UI `Progress.Root.value: number | null`, `null` = indeterminate) instead of Radix's optional `value?: number`. The old wrapper defaulted a missing/undefined `value` to `0` via `value || 0` in its manual transform calculation; that fallback no longer exists because there's no manual transform anymore. Any consumer currently omitting `value` (relying on the old implicit `0`) will now get a `tsc` error and must pass an explicit `value` (or `null` for indeterminate). No such consumer was found via `grep` for `@repo/ui/components/progress` at the time of this migration, but flagging per the hard rule — this was not silently patched (e.g. by defaulting `value = 0` in the wrapper), since that would mask real indeterminate-progress use cases the new API is designed to support.
- Indeterminate state is now a first-class supported case (`value={null}`) with dedicated `data-indeterminate` styling hooks (`ProgressRootDataAttributes.indeterminate` etc.) — previously Radix's indeterminate support existed but this wrapper never exposed or styled it; still not styled here (out of scope — no CSS for `data-indeterminate`/`data-complete`/`data-progressing` was added, since the original had none either), just flagging the new capability exists if wanted later.

## Verify by hand

1. Render `<Progress value={40} />`; confirm the filled bar width is proportional (should visually match the old `translateX` behavior — pixel-for-pixel it's `width: 40%` now instead of `translateX(-60%)` on a full-width bar, which is visually equivalent).
2. Animate `value` from 0 → 100 over time; confirm the `transition-all` class still produces a smooth fill animation.
3. Try `value={null}`; confirm it doesn't throw and check whether any indeterminate visual is desired (currently unstyled, matches pre-migration state).
4. Confirm removing `value` entirely on a call site now produces a `tsc` error rather than silently rendering an empty bar.
