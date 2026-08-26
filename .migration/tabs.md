# tabs

Legacy style (`default`), engine transform. Golden radix reference fetched from
`https://ui.shadcn.com/r/styles/default/tabs.json` for classification only. Verdict:
pristine (byte-for-byte match to golden, modulo formatting) — part renames, data-attribute
rewrite, and the documented `aria-disabled:` addition; manual-activation default flip
FLAGGED per SKILL.md's hard rules, not patched.

## Changed

- `src/components/tabs.tsx`:
  - Import swapped: `import * as TabsPrimitive from "@radix-ui/react-tabs"` ->
    `import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"`.
  - `TabsPrimitive.Root` / `.List` unchanged.
  - `TabsPrimitive.Trigger` -> `TabsPrimitive.Tab` (part rename per the part-rename
    quick reference).
  - `TabsPrimitive.Content` -> `TabsPrimitive.Panel`.
  - `data-[state=active]:` -> `data-active:` in `TabsTrigger`'s className
    (`data-active:bg-background data-active:text-foreground data-active:shadow-sm`).
  - Added `aria-disabled:pointer-events-none aria-disabled:opacity-50` alongside the
    existing `disabled:pointer-events-none disabled:opacity-50` on `TabsTrigger`, per
    universal-patterns.md: "Some triggers gain `aria-disabled:*` variants alongside
    `disabled:*` (accordion, tabs)" — Base UI's `Tab` can render disabled state via
    `aria-disabled` depending on how the disabled item is reached, so both variants are
    kept for full coverage (matches the documented pattern, not a discretionary
    addition).
  - `.displayName = TabsPrimitive.X.displayName` -> literal strings (`"TabsList"`,
    `"TabsTrigger"`, `"TabsContent"`).
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/tabs.tsx` -> clean.

## Left alone

None — single file in scope.

## Behavior changes

- **Manual activation default flip (FLAGGED, not patched, per SKILL.md hard rules and
  wrapper-shapes.md's explicit instruction to match the golden base registry exactly)**:
  Radix's `activationMode` defaulted to `"automatic"` (arrow-key focus immediately
  switches the active tab). Base UI 1.6+ defaults `List.activateOnFocus` to `false`
  (manual activation — arrow keys move focus, Enter/Space commits the switch). This
  wrapper does **not** set `activateOnFocus` on `TabsList`, matching the base registry's
  own choice (wrapper-shapes.md: "The base registry accepts Base UI's manual-activation
  default... Match it: flag the behavior delta, do not patch it"). Net effect: keyboard
  users navigating tabs with arrow keys will now need to press Enter/Space to activate a
  tab, instead of it activating automatically on focus.
- `Tab`'s `[data-state="active"|"inactive"]` (Radix marks the *active* state) is replaced
  by `Panel`'s `[data-hidden]` (Base UI marks the *hidden* state) — inverted polarity on
  the panel side; this wrapper only styles the trigger's active state (`data-active` on
  `Tab`), not panel visibility classes, so no observed effect here.

## Known consumer break (out of batch scope — NOT fixed here)

Four call sites pass `data-[state=active]:bg-accent` directly as an override
`className` on `<TabsTrigger>`, which after this migration becomes a dead selector
(should be `data-active:bg-accent`) — these are app files, outside this batch:
- `apps/start/src/components/admin/panels/releases-list.tsx:136`
- `apps/start/src/components/admin/panels/tasks.tsx:276`
- `apps/start/src/components/admin/panels/tasks.tsx:286`
- `apps/start/src/components/admin/panels/tasks.tsx:296`

## Verify by hand

- Click between tabs: active tab styling (background/shadow) follows the click.
- Keyboard: focus the tab list, press arrow keys — focus should move between tabs without
  switching the active panel; press Enter/Space to actually activate the focused tab
  (this is the flagged manual-activation delta above — confirm it feels intentional, not
  broken).
- Disabled tab (if any consumer uses one): not clickable, dimmed via `disabled:`/
  `aria-disabled:` styling.
