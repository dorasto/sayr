# collapsible

Legacy style (`default`), engine transform. Golden radix reference fetched from
`https://ui.shadcn.com/r/styles/default/collapsible.json` for classification only.
Verdict: pristine (project file was a byte-for-byte match to the golden, modulo
formatting) — rewired the primitives only, no class changes needed.

## Changed

- `src/components/collapsible.tsx`:
  - Import swapped: `import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"`
    -> `import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"`.
  - `CollapsiblePrimitive.Root` stays `.Root`.
  - `CollapsiblePrimitive.CollapsibleTrigger` -> `CollapsiblePrimitive.Trigger` (radix
    exposed the same part under two names, `Trigger` and the aliased
    `CollapsibleTrigger`; Base UI only has `Trigger`).
  - `CollapsiblePrimitive.CollapsibleContent` -> `CollapsiblePrimitive.Panel` (same
    dual-name situation on the radix side; `Content -> Panel` per the disclosure family
    part-rename table).
  - File stays a set of bare re-exports (no wrapper functions, no classes) — matches the
    original shape exactly.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/collapsible.tsx` ->
    clean.

## Left alone

None — single file in scope.

## Behavior changes

None from this wrapper's own code (no classes, no props transformed). See the consumer
note below for a downstream effect.

## Known consumer break (out of batch scope — NOT fixed here)

`apps/start/src/components/public/public-task-creator.tsx:312` uses
`<CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">`.
Base UI's `Collapsible.Panel` DOES emit both `data-open` and `data-closed` presence
attributes (unlike Accordion's Panel, which only gets `data-open`), so this is a
straightforward, low-risk mechanical rename once touched:
`data-[state=closed]:` -> `data-closed:`, `data-[state=open]:` -> `data-open:`. Note also
that `animate-collapsible-up`/`animate-collapsible-down` are not defined anywhere in the
repo (no `@keyframes`, no tailwind config) — same pre-existing dead-class situation found
in `accordion.tsx`'s old `animate-accordion-up/down`, not something this migration
introduced. Not touched here (app code, outside this batch's file list).

## Verify by hand

- Toggle a `Collapsible` open/closed via its trigger: panel should show/hide with no
  console errors.
- Keyboard: focus the trigger, press Space/Enter, panel toggles.
- Confirm no `@radix-ui/react-collapsible` import remains anywhere referencing this file.
