# checkbox

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/checkbox.json` for diff purposes only) + hand transform via the transformation engine. Verdict: customized vs golden, migrated in place, primitives rewired, project's exact classes preserved.

## Changed

- `packages/ui/src/components/checkbox.tsx`
  - Classification: comparing against the "default"-style golden, this file was already customized — golden's Root class starts with `grid place-content-center peer h-4 w-4 ...`, the project's starts with `peer h-4 w-4 ...` (no `grid place-content-center`); golden's Indicator is `grid place-content-center text-current`, the project's is `flex items-center justify-center text-current`. Both customizations were preserved exactly as-is.
  - `import * as CheckboxPrimitive from "@radix-ui/react-checkbox"` → `import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"` (line 3).
  - `Root`/`Indicator` part names are unchanged (direct 1:1 mapping per `form-controls.md`).
  - Class rewrite (line 15): `disabled:cursor-not-allowed disabled:opacity-50` → `data-disabled:cursor-not-allowed data-disabled:opacity-50`, and `data-[state=checked]:` → `data-checked:`. Reason: Base UI `Checkbox.Root` renders a `<span>` + hidden `<input>` instead of Radix's `<button>`, so the native `:disabled`-driven `disabled:` Tailwind variant is dead on the new element; disabled state is now exposed via `data-disabled` (per `class-mapping.md`'s "Element changes kill pseudo-class variants" rule). Indicator's own classes (`flex items-center justify-center text-current`) were left untouched — no data-attribute dependency there.
  - `Checkbox.displayName` changed from `CheckboxPrimitive.Root.displayName` (a Radix static, no longer exists) to the literal string `"Checkbox"`.
  - `ref`/props typing kept as `React.ElementRef<typeof CheckboxPrimitive.Root>` / `React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>` — Base UI's `CheckboxRoot` is a real `ForwardRefExoticComponent<... RefAttributes<HTMLElement>>`, so this pattern still resolves correctly (verified against `checkbox/root/CheckboxRoot.d.ts`).
- Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/checkbox.tsx` → clean.

## Left alone

- `packages/ui/src/components/tasks/columns.tsx` — a pre-existing, unimported (dead) shadcn "tasks" demo file in this package (verified: nothing in `apps/` or `packages/` imports it; it also has multiple pre-existing broken imports to a nonexistent `@repo/components/ui/*` alias, same directory as the already-flagged `team-switcher.tsx`). This checkbox migration surfaces ONE new `tsc` error there: `checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}` no longer type-checks, because Base UI's `Checkbox.Root.checked` is `boolean` only (Radix allowed `boolean | "indeterminate"`; Base UI splits that into a separate `indeterminate` boolean prop — see `form-controls.md`). Not fixed: this file is dead code outside the batch scope, and the underlying pattern (`checked={... || "indeterminate"}`) is a real API break that belongs to a consumer-sweep wave, not this wrapper-only batch.

## Behavior changes

- **`checked="indeterminate"` is no longer valid.** Any real (non-dead-code) consumer passing `checked={"indeterminate"}` or `checked={boolean | "indeterminate"}` must switch to the separate `indeterminate` boolean prop (Base UI `Checkbox.Root` decouples `checked` and `indeterminate`). No such consumer was found via `grep` for `@repo/ui/components/checkbox` at the time of this migration, other than the dead-code file above, but flagging per the hard rule (never silently patch behavior deltas).
- Root's rendered element changed from a real `<button>` to a `<span>` + hidden `<input>`. Anything relying on native `:disabled`/`disabled` attribute behavior (e.g. `disabled:*` Tailwind variants, or `peer-disabled:*` on a sibling label targeting this exact peer) will no longer fire — the wrapper's own `disabled:*` classes were rewritten to `data-disabled:*` accordingly, but any *external* CSS/selectors that assumed a real `<button disabled>` should be checked.

## Verify by hand

1. Click a checkbox to check/uncheck; confirm the `Check` icon shows/hides and the box background/border/text-color flips (bg-primary/text-primary-foreground).
2. Tab to a checkbox with keyboard, press Space; confirm it toggles (Base UI keeps native keyboard semantics via the hidden `<input>`).
3. Set `disabled` on a checkbox; confirm it's visually dimmed (`opacity-50`) and unclickable, both by mouse and keyboard.
4. Submit a form containing a checked/unchecked checkbox with a `name`; confirm the hidden input still participates in `FormData` correctly.
