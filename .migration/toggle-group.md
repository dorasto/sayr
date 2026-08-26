# toggle-group

2026-08-26. Legacy style (`default`, base `radix`) — no `base-default` counterpart, so classification-only: fetched `https://ui.shadcn.com/r/styles/default/toggle-group.json` as radix-golden to confirm the wrapper is PRISTINE (byte-identical to stock except import aliases), then hand-transformed via the transformation engine against `disclosure.md`'s toggle-group section and the installed `@base-ui/react/toggle-group` + `@base-ui/react/toggle` `.d.ts` files. Verdict: migrated, composing the already-migrated local `Toggle` wrapper as group items rather than a 1:1 `Item` part rename (Base UI's `toggle-group` has no `Item` part).

## Changed

- `packages/ui/src/components/toggle-group.tsx` — full rewrite:
  - Import swapped: `import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"` -> `import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"`.
  - `ToggleGroupPrimitive.Root` -> callable `ToggleGroupPrimitive` (single-part primitive per the universal callable-primitive rule). Verified against `node_modules/@base-ui/react/toggle-group/ToggleGroup.d.ts`: `ToggleGroup` is a group/context primitive rendering a `<div>`, NOT a compound Root/Item pair.
  - `ToggleGroupPrimitive.Item` has no Base UI equivalent — verified via the same `.d.ts` and `node_modules/@base-ui/react/toggle/Toggle.d.ts`: Base UI's toggle-group model is "plain `Toggle` components placed inside `<ToggleGroup>`, joined by matching `value` props," not a distinct Item part. `ToggleGroupItem` now composes the project's own already-migrated `Toggle` wrapper (`@repo/ui/components/toggle`, Wave A) instead of a primitive `Item` part — it forwards `variant`/`size` (still resolved via the same `context.variant || variant` precedence as before) to `Toggle`, which internally applies `toggleVariants`. This avoids double-applying `toggleVariants` (previously applied directly by `ToggleGroupItem`; now applied once, inside `Toggle`) while producing the identical final class string for any given variant/size combination.
  - Types: `React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>` -> `ToggleGroupPrimitive.Props` (namespace-merged type export, same pattern `toggle.tsx` already uses for `TogglePrimitive.Props`). `React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>` -> `React.ComponentPropsWithoutRef<typeof Toggle>` (picks up the local wrapper's props, including the Base UI `value?: string` used for group membership, which flows through `...props`).
  - `ref` types: `React.ElementRef<typeof ToggleGroupPrimitive.Root>` -> `HTMLDivElement`; `React.ElementRef<typeof ToggleGroupPrimitive.Item>` -> `HTMLButtonElement` (matches `Toggle`'s own explicit ref type in `toggle.tsx`, since generic Base UI function components don't resolve cleanly through `ComponentRef`).
  - `displayName` assignments: `ToggleGroupPrimitive.Root.displayName` / `.Item.displayName` (no longer exist on the Base UI export) -> literal strings `"ToggleGroup"` / `"ToggleGroupItem"`.
  - Exact original classes preserved verbatim: `"flex items-center justify-center gap-1"` on the group; `toggleVariants({...})` output (now via `Toggle`) plus `className` on items.
  - Import order re-sorted alphabetically to match the project's existing convention (mirrors the original file's ordering, just with `@base-ui/react/toggle-group` swapped in for `@radix-ui/react-toggle-group` in the same first slot).
  - Formatted via `pnpm exec biome format --write` from `packages/ui` (collapsed the `ToggleGroup` forwardRef generic onto one line per the project's line-width rule).

Leftover scan, both target files, clean (no matches):
```
grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/toggle-group.tsx
grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/tomui/timeline.tsx
```

## Left alone

- `packages/ui/src/components/toggle.tsx` — already migrated in Wave A; consumed as-is, not re-touched.
- No consumers exist yet: `grep -rln "ToggleGroup"` across `packages/` and `apps/` returns only `toggle-group.tsx` itself, so there is no call-site sweep needed for this component.

## Behavior changes

- **`type="single"|"multiple"` -> `multiple` boolean.** Base UI dropped the string enum in favor of a boolean prop (default `false` = single-select). Any future consumer passing `type="single"`/`type="multiple"` will need updating to omit the prop or pass `multiple`.
- **`value`/`defaultValue` are now always an array**, even in single-select mode (`value="bold"` -> `value={["bold"]}`; unselected single mode is `[]` instead of Radix's `""`). `onValueChange` signature changed to `(groupValue: Value[], eventDetails) => void`.
- **`rovingFocus` dropped** — Base UI's roving focus is always on, no opt-out. A consumer that previously set `rovingFocus={false}` (making every item individually tabbable) has no direct replacement.
- **`loop` renamed to `loopFocus`** (same default `true`).
- **`dir` dropped** — direction now comes from the DOM `dir` attribute / a `DirectionProvider`, not a prop.
- These are flagged per the skill's hard rule (never silently patched); since there are currently zero consumers in the repo, none of them are exercised yet — a future consumer sweep (Wave D or whoever adds the first usage) needs this list.

## Verify by hand

1. Render a `ToggleGroup` with 3+ `ToggleGroupItem`s in single-select mode; click through items and confirm only one stays pressed (`data-pressed`) at a time, with `variant`/`size` styling matching what the group-level props previously produced.
2. Switch to multi-select (`multiple` instead of the old `type="multiple"`); confirm more than one item can be pressed simultaneously.
3. Keyboard: focus the group, arrow through items, confirm focus loops (Tab in from outside should land on one roving-focus item, not all of them — this is now unconditional, no `rovingFocus={false}` escape hatch).
4. Confirm per-item `variant`/`size` overrides still take a back seat to a group-level `variant`/`size` (context precedence unchanged: `context.variant || variant`).
