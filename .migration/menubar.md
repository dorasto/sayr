# menubar

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/menubar.json` for diff purposes only) + hand transform via the transformation engine (`universal-patterns.md`, `menus.md`, `class-mapping.md`, `wrapper-shapes.md`). Verdict: mostly pristine vs golden (only `min-w-32`/`min-w-48` instead of `min-w-[8rem]`/`min-w-[12rem]`, plus formatting), migrated in place, primitives rewired.

## Changed

- `packages/ui/src/components/menubar.tsx`
  - `import * as MenubarPrimitive from "@radix-ui/react-menubar"` → TWO imports: `import { Menu as MenubarPrimitive } from "@base-ui/react/menu"` (for every menu-family part: `Menu`/`Trigger`/`Portal`/`Content`/`Item`/`CheckboxItem`/`RadioItem`/`RadioGroup`/`Label`/`Separator`/`Sub`/`SubTrigger`/`SubContent`) and `import { Menubar as MenubarRootPrimitive } from "@base-ui/react/menubar"` (for the top-level `Menubar` container only). Per `menus.md`: "Base UI's menubar module exports a single `<Menubar>` container. Every menu inside it is built from `Menu.*` parts" — Radix's `Menubar.Menu` maps directly to `Menu.Root`.
  - `Menubar` (the root container) changed from wrapping `MenubarPrimitive.Root` to wrapping the bare `MenubarRootPrimitive` component directly (Base UI's `Menubar` has no `.Root` sub-part — it IS the root, a single `ForwardRefExoticComponent`, confirmed via `Menubar.d.ts`).
  - Part renames (all via the `Menu` subpath): `.Sub` → `.SubmenuRoot`, `.SubTrigger` → `.SubmenuTrigger`, `.Label` → `.GroupLabel`, `.ItemIndicator` → `.CheckboxItemIndicator` / `.RadioItemIndicator`. `MenubarSub`'s pre-existing `data-slot="menubar-sub"` attribute (already present in the source, the only `data-slot` anywhere in this file) was preserved as-is.
  - `Content`/`SubContent` restructured to `Portal > Positioner > Popup`. Main `MenubarContent` exposes `Pick<Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">` with the project's existing defaults (`align="start" alignOffset={-4} sideOffset={8}`) forwarded explicitly to `Positioner`. `SubContent` uses `align="start" alignOffset={-3} side="right" sideOffset={0}` — **these numeric defaults were borrowed from the dropdown-menu family's documented SubContent shape, since no menubar-specific golden pair exists to verify menubar's own submenu offset against** (flagged below and in Behavior changes).
  - Class rewrites: `data-[state=open]` → `data-popup-open` (Trigger/SubTrigger open markers) / `data-open`/`data-closed` (Content/Popup), `data-[disabled]` → `data-disabled` (already unprefixed in the source, no change needed), `origin-(--radix-menubar-content-transform-origin)` → `origin-(--transform-origin)`.
  - Converted every part from `React.forwardRef<ElementRef, ComponentPropsWithoutRef>` / manual `React.ComponentProps<typeof X>` function wrappers to plain function components typed as `MenubarPrimitive.<Part>.Props` / `MenubarRootPrimitive.Props`.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/menubar.tsx` → clean.

## Left alone

- Nothing else in this file.
- No consumers exist anywhere in the app: `grep -rln "Menubar" apps/start/src apps/marketing/src` returns zero results. This component is currently unused outside `packages/ui` itself, so there is no live consumer-sweep surface for this batch.

## Behavior changes

- **`Menubar` root drops the `value`/`defaultValue`/`onValueChange` controlled/uncontrolled active-menu-value system entirely** — no Base UI equivalent (hard drop, confirmed via `menus.md`'s Menubar Root table). Any future consumer wanting to control which top-level menu is open must instead control the individual `Menu.Root`'s own `open`/`onOpenChange` per menu. No current consumer uses these props (none exist), so no live break today.
- **`loop` prop (if used) renames to `loopFocus` and its default flips `false` → `true`.**
- **`closeOnClick` default flips on `CheckboxItem`/`RadioItem`** (menu stays open after toggling), same idiomatic-Base-UI default as dropdown-menu/context-menu, left unpatched per the hard rule.
- **`MenubarLabel` (now `GroupLabel`) must be nested inside a `MenubarGroup`** for `aria-labelledby` wiring, same caveat as the other menu-family files.
- **`SubContent` positioning defaults (`alignOffset={-3}`) were carried over from dropdown-menu, not verified against a menubar-specific golden pair** — flagged for hand verification since no shadcn base-registry menubar exists to confirm the exact offset menubar submenus should use.

## Verify by hand

Since there are no live consumers today, this requires mounting a throwaway `<Menubar>` with 2+ `MenubarMenu`s to check:

1. Arrow-key navigation across top-level menu triggers (left/right).
2. A submenu opens on hover/keyboard with the correct offset relative to its parent item (this is the unverified default flagged above).
3. Checkbox/radio items toggle and note the menu now stays open afterward.
4. Escape/outside-click closes the open menu.
