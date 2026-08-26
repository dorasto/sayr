# sheet

2026-08-26. Legacy style (`default`, base `radix`, no `base-default` counterpart) — classification-only against the radix golden (`https://ui.shadcn.com/r/styles/default/sheet.json`), then hand-transformed via the transformation engine. Sheet is built on Radix Dialog (same as `dialog.tsx`, separate wrapper with slide-direction variants). File is CUSTOMIZED vs golden (extra `showClose`/`overlay`/`portal` props, `bg-black/80` overlay color) — customizations preserved, only primitives rewired.

## Changed

- `packages/ui/src/components/sheet.tsx` — full rewrite:
  - Import: `import * as SheetPrimitive from "@radix-ui/react-dialog"` → `import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"` (Sheet reuses the Dialog primitive on both sides, same as before).
  - `Sheet = SheetPrimitive.Root`, `SheetTrigger`, `SheetClose`, `SheetPortal`: bare re-exports, unchanged shape.
  - `SheetOverlay`: `Overlay` → `Backdrop` rename. Class list: `data-[state=open]:animate-in` / `data-[state=closed]:animate-out` / `data-[state=closed]:fade-out-0` / `data-[state=open]:fade-in-0` → `data-open:` / `data-closed:`. (Pre-existing double-space typo in `"bg-black/80  data-open:..."` left exactly as found — not mine to clean up.)
  - `sheetVariants` (cva): base + all four `side` variants re-keyed the same way — `data-[state=open]:animate-in`/`data-[state=closed]:animate-out`/`data-[state=closed]:duration-300`/`data-[state=open]:duration-500` and the per-side `data-[state=closed]:slide-out-to-*`/`data-[state=open]:slide-in-from-*` → `data-open:`/`data-closed:`. Widths/borders/breakpoints untouched.
  - `SheetContentProps`: `React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>` → `...typeof SheetPrimitive.Popup`.
  - `SheetContent`: `Content` → `Popup`, no `Positioner` (centered/anchored-to-edge modal, same rule as `dialog.tsx` — Base UI's Dialog has no positioner part). `onOpenAutoFocus={(e) => e.preventDefault()}` (previously unconditional, no toggle prop) → `initialFocus={false}` (always-prevent, same as before).
  - `SheetPrimitive.Close`'s class list `data-[state=open]:bg-secondary` → `data-open:bg-secondary` (mechanical re-key only).
  - `SheetTitle`, `SheetDescription`: bare rewires, part names unchanged.
  - All `displayName` assignments switched from reading `SheetPrimitive.Part.displayName` to literal strings.
- Leftover sweep: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" sheet.tsx` → clean.

## Left alone

- **Pre-existing dead prop, NOT introduced by this migration:** `SheetContentProps.portal` (and its `portal = true` default) is destructured in `SheetContent` but never actually used to conditionally render — the component unconditionally wraps children in `<SheetPortal>` regardless of the prop's value. This was already true before the migration (verified against the pre-migration file); preserved verbatim per the skill's "only rewire primitives, don't fix unrelated bugs" scope. Flagging in case a maintainer wants to either wire it up or drop it in a follow-up.
- No sibling files needed changes.

## Behavior changes

- Enter/exit now keyed off `data-open`/`data-closed` instead of `data-state=open|closed` — same visual slide animation per side, selector rename only.
- `initialFocus={false}` reproduces the old unconditional `onOpenAutoFocus` preventDefault exactly — no behavior change.
- No consumer-facing prop renames on this wrapper's own public surface (`showClose`/`overlay`/`portal`/`side` are unchanged); did not find any `asChild` usage on `SheetClose`/`SheetTitle`/`SheetDescription` in `packages/ui` at the time of this batch, so no confirmed collateral breakage from this file specifically (unlike `dialog.tsx`'s siblings). A repo-wide grep is still recommended before considering the whole-project migration complete.

## Verify by hand

- Open a sheet from each `side` (`top`/`bottom`/`left`/`right`): should slide in from the correct edge, overlay fading in behind it, and slide back out on close.
- Close via the X button, Escape, and an outside click.
- Confirm focus does not auto-jump into the sheet's first focusable element on open (matches the old always-on `preventDefault()`).
