# aspect-ratio

Legacy style (`default`). No golden-pair classification needed — AspectRatio has **no
Base UI counterpart** (hard rule in SKILL.md and confirmed in universal-patterns.md's
coverage matrix: "AspectRatio | none | missing: plain div + CSS `aspect-ratio`"). Replaced
with a plain CSS `aspect-ratio` div, preserving the wrapper's public API (`ratio` prop,
default `1`) exactly as radix's `AspectRatio.Root` exposed it.

## Changed

- `src/components/aspect-ratio.tsx`: full rewrite.
  - Old: `const AspectRatio = AspectRatioPrimitive.Root;` (bare re-export of
    `@radix-ui/react-aspect-ratio`'s `Root`, which internally renders a two-div
    padding-bottom-trick wrapper: an outer `position: relative; width: 100%; padding-bottom: {100/ratio}%` div, and an inner `position: absolute; inset: 0` div carrying the
    forwarded ref/props/children).
  - New: a single `React.forwardRef<HTMLDivElement, ...>` div using the native CSS
    `aspect-ratio` property (`style={{ aspectRatio: ratio, ...style }}`), `ratio` prop
    defaulting to `1` (same default as radix), forwarding `ref`/`className`/`style`/
    `children`/all other div props directly — same public prop surface, simpler DOM (one
    div instead of two).
  - Dropped the `"use client"` directive — the replacement has no client-only primitive
    dependency (plain div, no hooks beyond `forwardRef`), so it's safe to render on the
    server. Flagging this removal explicitly since it's a deliberate, not accidental,
    change.
  - No consumers of this component were found anywhere in the repo (`grep -rln
    "components/aspect-ratio"` across `apps/` and `packages/` returned nothing), so there
    was no existing usage to preserve pixel-for-pixel beyond the prop API itself.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/aspect-ratio.tsx` ->
    clean.

## Left alone

None — single file in scope.

## Behavior changes

- DOM structure changed from two nested divs (radix's padding-bottom-percentage trick)
  to a single div using native CSS `aspect-ratio`. Visually equivalent in all modern
  browsers (native `aspect-ratio` support is universal in current browser baselines);
  flagging since it's a structural DOM change, not just a class rename, per SKILL.md's
  "no Base UI counterpart" hard rule.
- No `data-radix-aspect-ratio-wrapper` attribute anymore (radix set this on the outer
  div; nothing in the repo selects on it — grep found no references).

## Verify by hand

- Render `<AspectRatio ratio={16 / 9}><img className="h-full w-full object-cover" ... /></AspectRatio>`
  in a scratch page: box should maintain a 16:9 box regardless of container width.
- Resize the container: ratio holds.
- Omit `ratio` (default `1`): renders a square box.
