# radio-group

2026-08-26, strategy: legacy-style classification (radix golden fetched from `https://ui.shadcn.com/r/styles/default/radio-group.json`) + hand transform via the transformation engine. Verdict: heavily customized (the project's file was already on a much newer shadcn convention than the "default"-style golden), migrated in place with all customizations preserved.

## Changed

- `packages/ui/src/components/radio-group.tsx`
  - Classification: this file diverges substantially from the "default"-style golden — the golden still uses `React.forwardRef` + `lucide-react`'s `Circle` + classes like `"grid gap-2"` / `"aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none..."`; the project's file already used function components (no `forwardRef`), `data-slot` attributes, `CircleIcon`, `"grid gap-3"`, and modern classes with `aria-invalid:`/`dark:` variants. All of that customization was preserved verbatim — only the Radix plumbing was rewired.
  - `import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"` replaced with two subpath imports per `form-controls.md`/`universal-patterns.md`: `import { Radio } from "@base-ui/react/radio"` and `import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"` (lines 3–4). Base UI splits Radix's single `RadioGroup` namespace into two packages.
  - `RadioGroupPrimitive.Root` → callable `RadioGroupPrimitive` itself (Base UI's `RadioGroup` is a single-part, non-namespaced primitive — "single-part primitives are callable" per `universal-patterns.md`). `data-slot="radio-group"` and the `"grid gap-3"` class kept unchanged.
  - `RadioGroupPrimitive.Item` → `Radio.Root` (moved to the `Radio` namespace, per `form-controls.md`'s radio-group table). `data-slot="radio-group-item"` and the full customized class string kept, with one rewrite: `disabled:cursor-not-allowed disabled:opacity-50` → `data-disabled:cursor-not-allowed data-disabled:opacity-50` (line 18) — Base UI `Radio.Root` renders `<span>` + hidden `<input>` instead of Radix's `<button>`, so `disabled:` is dead and `data-disabled` is the live hook (`class-mapping.md`).
  - `RadioGroupPrimitive.Indicator` → `Radio.Indicator`. `data-slot="radio-group-indicator"` and its classes, plus the nested `CircleIcon`, kept unchanged.
  - Prop types switched from `React.ComponentProps<typeof RadioGroupPrimitive.Root>` / `.Item` to `React.ComponentProps<typeof RadioGroupPrimitive>` / `typeof Radio.Root` — both Base UI `RadioGroup` and `Radio.Root` are generic function components (`<Value>(props) => JSX.Element`, default `Value = any`), verified against `RadioGroup.d.ts`/`RadioRoot.d.ts`, so `React.ComponentProps<...>` still resolves correctly with `Value` defaulting to `any`.
- Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/radio-group.tsx` → clean.

## Left alone

Nothing else needed touching in this file.

## Behavior changes

- **Dropped props, per `form-controls.md`, none observed in use in this wrapper but worth flagging for any consumer:** `orientation` (Base UI handles both-axis arrow-key nav automatically, no prop), `dir` (use `DirectionProvider` instead), `loop` (focus wrapping is always on, not configurable). This wrapper never exposed these itself (it only forwards `...props`), so any consumer currently passing them will silently have no effect rather than a type error, since they simply won't be recognized as valid props by the updated type (compile error if actually passed, since Base UI's Props type no longer declares them).
- Item/`Radio.Root` rendered element changed from a real `<button>` to `<span>` + hidden `<input>` — same disabled-attribute caveat as checkbox/switch (mitigated in this wrapper's own classes via the `data-disabled:*` rewrite; external code assuming a native disabled `<button>` should be checked).

## Verify by hand

1. Click each radio option in a group; confirm only one is selected at a time and the filled dot (`CircleIcon`) shows/hides correctly.
2. Arrow-key navigate through the group with keyboard focus on one item; confirm focus and selection move together (arrow-key nav is now built into Base UI, unconfigurable).
3. Set `disabled` on the group or a single item; confirm dimmed + inert styling and behavior.
4. Check `aria-invalid` styling (`aria-invalid:ring-destructive/20`, `aria-invalid:border-destructive`) still renders if any consumer sets `aria-invalid` on an item.
