# context-menu

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/context-menu.json` for diff purposes only) + hand transform via the transformation engine (`universal-patterns.md`, `menus.md`, `class-mapping.md`, `wrapper-shapes.md`). Verdict: customized vs golden, migrated in place, primitives rewired to `@base-ui/react/context-menu`, project's exact classes preserved.

## Changed

- `packages/ui/src/components/context-menu.tsx`
  - Classification: comparing against the "default"-style golden, this file was heavily customized — `rounded-xl`/`rounded-xl!` instead of `rounded-sm`/`rounded-md`, a `side` prop on `CheckboxItem` (left/right indicator placement), a `showDot` prop on `RadioItem` (conditionally renders the indicator), an extra `data-[state=checked]:bg-accent` class on `RadioItem`. All preserved exactly.
  - `import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"` → `import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"` — ContextMenu has its OWN Base UI subpath (not `@base-ui/react/menu`), sharing the same part set per `menus.md`.
  - Part renames: `.Sub` → `.SubmenuRoot`, `.SubTrigger` → `.SubmenuTrigger`, `.Label` → `.GroupLabel`, `.ItemIndicator` → `.CheckboxItemIndicator` / `.RadioItemIndicator`.
  - `Content`/`SubContent` restructured to `Portal > Positioner > Popup`. `SubContent` gets the ContextMenu-specific submenu defaults `align="start" alignOffset={4} side="right" sideOffset={0}` (per `wrapper-shapes.md` — note this differs from dropdown-menu's `alignOffset={-3}`, verified against the doc's explicit per-flavor table). Main `ContextMenuContent` only exposes `Pick<Positioner.Props, "alignOffset">` — Radix `ContextMenu.Content` has no `side`/`sideOffset`/`align` props (it's pointer-anchored, not trigger-anchored), so only `alignOffset` needed the Positioner-forward treatment; `side`/`align` are left at Base UI's own defaults.
  - Class rewrites: `data-[state=open]` → `data-open`/`data-closed`/`data-popup-open` (SubTrigger's open marker specifically uses `data-popup-open` per the submenu-trigger convention), `data-[disabled]` → `data-disabled` (already present unprefixed for `Item`/`CheckboxItem`/`RadioItem` in the source, no change needed there), `data-[state=checked]:bg-accent` → `data-checked:bg-accent` on `RadioItem`, `origin-(--radix-context-menu-content-transform-origin)` → `origin-(--transform-origin)`, `max-h-(--radix-context-menu-content-available-height)` → `max-h-(--available-height)`.
  - Converted every part from `React.forwardRef<ElementRef, ComponentPropsWithoutRef>` to plain function components typed as `ContextMenuPrimitive.<Part>.Props`.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/context-menu.tsx` → clean.

## Left alone

- `import { s } from "framer-motion/client";` (line 5) — an unused, dead import already present in the file before this migration (verified: `s` is never referenced anywhere in the file). Unrelated to Radix/Base UI; left untouched per stay-in-scope rather than silently cleaning it up.

## Behavior changes

- **`ContextMenu.Root` has NO `modal` prop in Base UI** (hard drop, no equivalent — confirmed via `ContextMenuRoot.d.ts`). No consumer currently passes `modal` to `ContextMenu` in this codebase (grep found none), but flagging per the documented hard drop for any future usage.
- **`ContextMenu.Trigger` has NO `disabled` prop in Base UI** (hard drop — confirmed via `ContextMenuTrigger.d.ts`, which only has `className`/`style`/`render`). Same caveat: no current usage found, flagged for the future.
- **`closeOnClick` default flips on `CheckboxItem`/`RadioItem`** — same idiomatic-Base-UI default as dropdown-menu (menu stays open after toggling), left unpatched per the hard rule.
- **`ContextMenuLabel` (now `GroupLabel`) must be nested inside a `ContextMenuGroup`** for `aria-labelledby` wiring, same caveat as dropdown-menu.

## Verify by hand

1. Right-click to open the context menu; confirm it anchors to the pointer position (not a fixed trigger element).
2. Hover/keyboard into a submenu; confirm the offset (`alignOffset=4`) looks correct against the parent item.
3. Toggle a checkbox item (`side="left"` and `side="right"` variants if both are used) and a radio item (`showDot` on/off); confirm visual placement of the indicator matches before/after.
4. Escape key and outside click both close the menu.
