# avatar

Legacy style (`default`), engine transform. Golden radix reference fetched from
`https://ui.shadcn.com/r/styles/default/avatar.json` for classification only.
Verdict: pristine (identical classNames/structure to golden, differing only in
indentation/tabs vs the registry's 2-space format) — single-line primitive rewire, zero
class changes.

## Changed

- `src/components/avatar.tsx`:
  - Import swapped: `import * as AvatarPrimitive from "@radix-ui/react-avatar"` ->
    `import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"`.
  - `AvatarPrimitive.Root` / `.Image` / `.Fallback` part names are unchanged (direct
    1:1 mapping per the coverage matrix).
  - `.displayName = AvatarPrimitive.X.displayName` reads left as-is — Base UI's Avatar
    parts are `React.ForwardRefExoticComponent`s and do carry a (possibly `undefined`)
    `.displayName` field, so this still typechecks; no behavior change.
  - Classes untouched: `relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full`
    (Root), `aspect-square h-full w-full` (Image), `flex h-full w-full items-center
    justify-center rounded-full bg-muted` (Fallback) — no data-attribute selectors were
    in use, so no class-mapping rewrites were needed.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/avatar.tsx` -> clean.

## Left alone

None — single file in scope.

## Behavior changes

None functionally. Note per disclosure/display-misc docs: `Avatar.Fallback`'s
`delayMs` prop is renamed to `delay` in Base UI (same meaning, ms before showing
fallback) — this wrapper doesn't set that prop itself, so no effect here; flagging only
in case any consumer passes `delayMs` directly (none found in the repo).

## Verify by hand

- Render an Avatar with a valid image URL: image should display.
- Render an Avatar with a broken/missing image URL: fallback (e.g. initials) should show
  after the image fails to load.
- Confirm rounded/overflow clipping still looks correct (Root renders `<span>` in Base UI
  vs radix's `<span>` too — no DOM element change here).
