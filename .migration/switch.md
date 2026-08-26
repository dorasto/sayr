# switch

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/switch.json`) + hand transform via the transformation engine. Verdict: pristine (matches golden byte-for-byte modulo the import alias), migrated in place.

## Changed

- `packages/ui/src/components/switch.tsx`
  - Classification: diffed clean against the "default"-style golden (`import { cn } from "@/lib/utils"` vs the project's `@repo/ui/lib/utils` is the only difference, which is the expected alias substitution, not a customization) — pristine.
  - `import * as SwitchPrimitives from "@radix-ui/react-switch"` → `import { Switch as SwitchPrimitives } from "@base-ui/react/switch"` (line 3).
  - `Root`/`Thumb` part names unchanged (direct 1:1 mapping per `form-controls.md`).
  - Class rewrite (lines 13, 21): `disabled:cursor-not-allowed disabled:opacity-50` → `data-disabled:cursor-not-allowed data-disabled:opacity-50`; `data-[state=checked]:`/`data-[state=unchecked]:` → `data-checked:`/`data-unchecked:` (both Root and Thumb). Reason: same as checkbox — Base UI `Switch.Root` renders `<span>` + hidden `<input>` instead of Radix's `<button>`, so `disabled:` is dead and `data-disabled` is the live hook.
  - `Switch.displayName` changed from `SwitchPrimitives.Root.displayName` (Radix static, gone) to the literal `"Switch"`.
  - `ref`/props typing kept as `React.ElementRef<typeof SwitchPrimitives.Root>` / `React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>` — Base UI's `SwitchRoot` is a real `ForwardRefExoticComponent<... RefAttributes<HTMLElement>>` (verified against `switch/root/SwitchRoot.d.ts`), so this pattern still resolves.
- Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/switch.tsx` → clean.

## Left alone

Nothing else in this file's neighborhood needed touching.

## Behavior changes

- Root's rendered element changed from a real `<button>` to a `<span>` + hidden `<input>`, same caveat as checkbox: native `:disabled` pseudo-class-driven styling (outside this wrapper's own now-corrected `data-disabled:*` classes) will no longer apply if anything external depended on it.

## Verify by hand

1. Click a switch; confirm the thumb slides (`translate-x-5` when on, `translate-x-0` when off) and the track color flips (`bg-primary` checked / `bg-input` unchecked).
2. Tab to a switch, press Space; confirm it toggles via keyboard.
3. Set `disabled`; confirm it's visually dimmed and inert to both mouse and keyboard.
4. Submit a form containing the switch with a `name`; confirm the hidden input still reports `"on"`/absent correctly.
