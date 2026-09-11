# dropdown-menu

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/dropdown-menu.json` for diff purposes only) + hand transform via the transformation engine (`universal-patterns.md`, `menus.md`, `class-mapping.md`, `wrapper-shapes.md`). Verdict: customized vs golden, migrated in place, primitives rewired to `@base-ui/react/menu`, project's exact classes preserved.

## Changed

- `packages/ui/src/components/dropdown-menu.tsx`
  - Classification: comparing against the "default"-style golden, this file was customized — added `side`/`hideIcon` props on `SubTrigger` (with conditional `flex-row-reverse` and hidden chevron), `rounded-lg` instead of `rounded-sm` on `Content`/`Item`, `min-w-32` instead of `min-w-[8rem]`. All preserved exactly.
  - `import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"` → `import { Menu as DropdownMenuPrimitive } from "@base-ui/react/menu"` (DropdownMenu is a RENAMED target per `menus.md`; the namespace-style import keeps every `DropdownMenuPrimitive.X` call site unchanged).
  - Part renames: `.Sub` → `.SubmenuRoot`, `.SubTrigger` → `.SubmenuTrigger`, `.Label` → `.GroupLabel`, `.ItemIndicator` → `.CheckboxItemIndicator` / `.RadioItemIndicator` (split by parent item type).
  - `Content` and `SubContent` restructured from `Portal > Content` to `Portal > Positioner > Popup`, per the universal Positioner-forward rule: `Content` now destructures and explicitly forwards `align`/`alignOffset`/`side`/`sideOffset` to `Positioner` (Pick-typed) instead of letting them fall through onto the wrong node. `SubContent` gets the documented submenu defaults `align="start" alignOffset={-3} side="right" sideOffset={0}` (load-bearing per `wrapper-shapes.md`'s DropdownMenu SubContent table).
  - Class rewrites: `data-[state=open]` → `data-open`/`data-closed` presence forms, `origin-(--radix-dropdown-menu-content-transform-origin)` → `origin-(--transform-origin)`, `max-h-(--radix-dropdown-menu-content-available-height)` → `max-h-(--available-height)`. `data-disabled:` classes were already present unprefixed in the source (Tailwind v4 shorthand) and needed no change — Base UI also exposes `data-disabled` as a presence attribute, so this was already correct.
  - Converted every part from `React.forwardRef<ElementRef, ComponentPropsWithoutRef>` to plain function components typed as `DropdownMenuPrimitive.<Part>.Props` (ref is a normal prop on Base UI's `ForwardRefExoticComponent`s under React 19) — matches the idiomatic Base UI shape used by the shadcn base registry.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/dropdown-menu.tsx` → clean.

## Left alone

- Nothing else in this file; all parts were touched (the whole file is DropdownMenu-family primitives).

## Behavior changes

- **`closeOnClick` default flips on `CheckboxItem`/`RadioItem`.** Radix closed the menu on select by default (unless `event.preventDefault()` in `onSelect`); Base UI's `Menu.CheckboxItem`/`Menu.RadioItem` default `closeOnClick` to `false`. The menu will now stay open after toggling a checkbox/radio item unless a consumer explicitly passes `closeOnClick`. Per the hard rule ("menu items not closing on click" is explicitly named as a flag-don't-patch case), this was left as the idiomatic Base UI default, not silently patched.
- **`DropdownMenuLabel` (now `GroupLabel`) must be nested inside a `DropdownMenuGroup`** to wire `aria-labelledby` — Radix's `Label` could float freely anywhere in the content. Any consumer rendering `DropdownMenuLabel` outside a `DropdownMenuGroup` will silently lose the `aria-labelledby` association (no crash, just a quieter a11y regression).
- **Consumer breakage — `asChild` removed from `Trigger`/`Item`.** `tsc` surfaced 3 new errors from files outside this batch that still pass `asChild`:
  - `packages/ui/src/components/tasks/columns.tsx:214` — `<DropdownMenuTrigger asChild><Button .../></DropdownMenuTrigger>`. **Dead code**: this file is not imported anywhere in `apps/` or `packages/` (verified via grep), consistent with the same finding already recorded for `team-switcher.tsx` in other reports in this batch run.
  - `packages/ui/src/components/tomui/tabbed-dialog.tsx:423` — `<DropdownMenuItem asChild ...><a href={tab.href}>...</a></DropdownMenuItem>`. **Live code** — this file is imported by `apps/start/src/components/settings/user-settings-dialog.tsx`. Needs a follow-up fix: `render={<a href={tab.href}>{content}</a>}` (or switch to `Menu.LinkItem` for the anchor case, per `menus.md`'s Item table).
  - `packages/ui/src/components/tomui/tabbed-dialog.tsx:483` — `<DropdownMenuTrigger asChild><Button .../></DropdownMenuTrigger>`. **Live code**, same file/consumer as above. Needs `render={<Button variant="accent" size="icon" className="ml-auto">...</Button>}`.
  These are NOT part of this batch (files outside the assigned 5); flagged here for the consumer-sweep wave, not fixed in this pass.

## Verify by hand

1. Open a dropdown menu; verify arrow-key navigation and typeahead (typing a letter jumps to the matching item).
2. Hover/right-arrow into a submenu; confirm it opens offset correctly to the right of the parent item (no visual gap or overlap).
3. Toggle a checkbox item and a radio item; note the menu now stays open after the click (see Behavior changes) — confirm this is acceptable, or explicitly pass `closeOnClick` at call sites that need the old behavior.
4. Escape key and outside click both close the menu.
5. Check the open/close transform-origin animation looks correct from all four sides (top/bottom/left/right anchors).
