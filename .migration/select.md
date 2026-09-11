# select

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/select.json` for diff purposes only) + hand transform via the transformation engine (`universal-patterns.md`, `menus.md`, `class-mapping.md`, `wrapper-shapes.md`). Verdict: heavily customized vs golden (the project's file already resembled a newer post-2024 shadcn select — `data-slot` attributes throughout, `size` prop, right-aligned item indicator — while the fetched "default"-style golden is an older pre-`data-slot` radix version), migrated in place, primitives rewired to `@base-ui/react/select`, project's exact classes preserved except one engine-mandated structural exception (see below).

## Changed

- `packages/ui/src/components/select.tsx`
  - `import * as SelectPrimitive from "@radix-ui/react-select"` → `import { Select as SelectPrimitive } from "@base-ui/react/select"`.
  - **`Select` (Root) changed from a `data-slot="select"`-wrapped function component to a bare `const Select = SelectPrimitive.Root;` reassignment.** This is not a stylistic choice — `SelectPrimitive.Root.Props<Value, Multiple>` is generic (confirmed via `SelectRoot.d.ts`: `function SelectRoot<Value, Multiple>(props: SelectRoot.Props<Value, Multiple>)`), which breaks the `React.ComponentProps<typeof X>` pattern used for every other part in this file. This exact gap and its resolution (bare re-export, no wrapper, no `data-slot` on Root) is documented in `wrapper-shapes.md`'s Select section. Net effect: `data-slot="select"` is no longer present on the root element (flagged below).
  - Part renames: `.Label` → `.GroupLabel`, `.Viewport` → `.List`, `.ScrollUpButton` → `.ScrollUpArrow`, `.ScrollDownButton` → `.ScrollDownArrow` (public wrapper function names `SelectScrollUpButton`/`SelectScrollDownButton` kept as-is; only the underlying primitive part changed).
  - `SelectTrigger`'s `<SelectPrimitive.Icon asChild><ChevronDownIcon .../></SelectPrimitive.Icon>` → `<SelectPrimitive.Icon render={<ChevronDownIcon className="size-4 opacity-50" />} />` (asChild → render, single-child worked example from `universal-patterns.md`).
  - `SelectContent` restructured to `Portal > Positioner > Popup > List`. The `position="item-aligned" | "popper"` prop was replaced with `alignItemWithTrigger` (boolean, default `true`) picked from `Positioner.Props` and explicitly forwarded (Positioner-forward rule) — `true` matches the project's previous `item-aligned` default, `false` matches the old `popper` mode. The "popper"-only styling (translate-offset classes on the popup, full-width/trigger-height-matched viewport) now keys off `!alignItemWithTrigger` instead of `position === "popper"`.
  - CSS vars: `--radix-select-content-available-height` → `--available-height`, `--radix-select-content-transform-origin` → `--transform-origin`, `--radix-select-trigger-height`/`--radix-select-trigger-width` → `--anchor-height`/`--anchor-width` (on the `List`, in the `!alignItemWithTrigger` branch).
  - `data-[disabled]:pointer-events-none data-[disabled]:opacity-50` on `SelectItem` → `data-disabled:` (unprefixed, matching the shorthand already used elsewhere in this same file, e.g. on `SelectTrigger`'s `disabled:cursor-not-allowed`).
  - Every part converted from `React.ComponentProps<typeof SelectPrimitive.X>` (already function components in the source, no `forwardRef` in this file) to `SelectPrimitive.<Part>.Props`.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/select.tsx` → clean.

## Left alone

- `data-[placeholder]:text-muted-foreground` on `SelectTrigger` kept exactly as bracket-form (not renamed) — verified via `SelectTriggerDataAttributes.d.ts`/`SelectValueDataAttributes.d.ts` that Base UI's `Trigger`/`Value` genuinely expose the same `data-placeholder` presence attribute name; only the primitive underneath changed, the selector itself needed no rewrite.
- `min-w-[8rem]` on `SelectContent`'s popup kept as literal bracket notation, NOT normalized to `min-w-32` (unlike the other 4 files in this batch, which already used `min-w-32` in their own source). Preserved exactly as the project's source had it, to stay minimal-diff rather than opportunistically modernizing unrelated syntax.

## Behavior changes

- **`data-slot="select"` no longer present on the root element.** Purely a DOM/introspection attribute (not visual), a direct consequence of the bare-re-export requirement above. Anything selecting `[data-slot="select"]` (e.g. a CSS rule or test selector) would need updating — none found via grep in this codebase, but flagged since it's an observable diff.
- **Positioning model change underlying `alignItemWithTrigger`.** The prop swap (`position` → `alignItemWithTrigger`) is intended to be behavior-equivalent (default `true` = old `item-aligned`, `false` = old `popper`), but the underlying positioning engine is Base UI's own anchored `Positioner`, not Radix's. Verify the "item aligned with trigger" overlap behavior and the popper-mode full-width sizing look correct in both modes.

## Verify by hand

1. Open the select (default/`item-aligned` mode); confirm the currently-selected item's text visually overlaps the trigger's displayed value (this is the whole point of `alignItemWithTrigger`).
2. Keyboard-navigate the open list with arrow keys and type-ahead (typing a letter jumps to a matching item).
3. With enough items to overflow the popup height, confirm the scroll-up/scroll-down arrows appear and scroll correctly.
4. Confirm the check icon shows next to the selected item, right-aligned as before.
5. If any consumer ever explicitly sets `position="popper"` on `SelectContent` (grep found none today), re-verify it still renders full-width and pinned to the trigger after switching to `alignItemWithTrigger={false}`.
