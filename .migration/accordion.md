# accordion

Legacy style (`default`), engine transform. Golden radix reference fetched from
`https://ui.shadcn.com/r/styles/default/accordion.json` for classification only.
Verdict: customized wrapper (project drops golden's `hover:underline` on the trigger and
adds a `showChevron` prop gating the chevron icon) — both preserved verbatim; only the
Radix primitives were rewired.

## Changed

- `src/components/accordion.tsx`:
  - Import swapped: `import * as AccordionPrimitive from "@radix-ui/react-accordion"` ->
    `import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"`. Multi-part
    primitive, so `Root`/`Item`/`Header`/`Trigger` parts stay namespaced under the alias
    (per the part-rename table: same names except `Content -> Panel`).
  - `AccordionPrimitive.Content` -> `AccordionPrimitive.Panel` throughout.
  - Trigger open-state selector: `[&[data-state=open]>svg]:rotate-180` ->
    `[&[data-panel-open]>svg]:rotate-180` (disclosure.md: accordion Trigger's open marker
    is `data-panel-open`, not `data-open`, unlike Item/Header/Panel).
  - Content animation restructured to match wrapper-shapes.md's "Accordion animation
    placement": the old `data-[state=closed]:animate-accordion-up
    data-[state=open]:animate-accordion-down` keyframe classes on `Content` could not be
    mechanically renamed — Base UI's `Panel` has **no `data-closed`** attribute (per
    disclosure.md's data-attribute table: "No `data-closed` on accordion parts (unlike
    collapsible); style closed state as the absence of `data-open`"), so
    `data-[state=closed]:...` has no valid target selector. Moved to the documented
    replacement shape instead: `Panel` keeps `overflow-hidden text-sm`; the **inner** div
    now carries `h-(--accordion-panel-height) data-starting-style:h-0
    data-ending-style:h-0 transition-[height]` alongside the original `pb-4 pt-0`. Note:
    grepping the repo found `animate-accordion-up`/`animate-accordion-down` were never
    actually defined anywhere (no `tailwind.config`, no `@keyframes` in `globals.css`,
    no other file references them) — this was pre-existing dead-class reference in the
    original wrapper, not something this migration broke.
  - `--radix-accordion-content-height` (implicit, via the dead animate-accordion-*
    classes) -> `--accordion-panel-height` (now explicitly used via `h-(--...)`).
  - `.displayName` statics switched from `AccordionPrimitive.X.displayName` reads to
    literal strings (`"AccordionItem"`, `"AccordionTrigger"`, `"AccordionContent"`) —
    `AccordionTrigger`/`AccordionContent` previously read `.displayName` off the radix
    export; kept `AccordionItem`'s pre-existing literal pattern for all three now.
  - `showChevron` prop, `border-b` on Item, and all other classes/behavior unchanged.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/accordion.tsx` -> clean.

## Left alone

None — single file in scope, no unrelated drift found.

## Behavior changes

- **Animation mechanism changed** from a CSS-keyframe idiom (`animate-accordion-up/down`,
  itself pre-existing dead code with no keyframes defined anywhere in the repo) to Base
  UI's transition-based `data-starting-style`/`data-ending-style` + `--accordion-panel-height`
  var, applied to the panel's inner div per the golden base registry shape. This is the
  standard, documented Base UI accordion animation pattern (wrapper-shapes.md) — not a
  discretionary restyle. Net effect: accordion open/close will now actually animate
  height (previously it silently did nothing, since the keyframes it referenced don't
  exist in this codebase); visually this is a *fix*, not a regression, but flagging since
  it changes rendered behavior.
- Trigger's chevron-rotate selector now keys off `data-panel-open` instead of
  `data-[state=open]` — functionally equivalent, no visible difference expected.
- `orientation`/`collapsible={false}`-equivalent behavior: Base UI Accordion no longer
  supports roving-focus `orientation` (deprecated no-op) and single mode is always
  collapsible (Radix's `collapsible={false}` default has no Base UI equivalent) — not
  used by this wrapper's current props surface, so no observed effect, but noting since
  it's a root-level capability drop per disclosure.md.

## Known consumer break (out of batch scope — NOT fixed here)

`apps/start/src/components/pages/admin/settings/orgId/ai.tsx:470` calls
`<Accordion type="single" collapsible>`. Base UI's `Accordion.Root` has no `type` or
`collapsible` prop (`type="multiple"` -> `multiple` boolean; `type="single"` -> omit;
`collapsible` has no equivalent, single mode is always collapsible) — this call site
will fail to typecheck once this wrapper change lands, and functionally the accordion's
open/close state is undefined until fixed. The same file's trigger className at line 473
(`[&[data-state=open]]:rounded-b-none`) also needs `data-panel-open`. This is app code,
outside this batch's file list — flagging for the consumer-sweep wave, not touching it
here.

## Verify by hand

- Expand/collapse an accordion item: panel height should animate smoothly (starting at
  0, transitioning to content height, and back) — this is new, working animation where
  before there was none.
- Chevron icon (when `showChevron` is true) rotates 180° on open/close.
- Multiple items: default `type="single"`-equivalent (no `multiple` prop passed) behaves
  as accordion (one open at a time) since `Accordion` is a bare re-export of `Root` with
  whatever props each call site passes — verify call sites don't rely on Radix's
  `type`/`collapsible` string API (Base UI's `multiple` boolean replaces `type`).
