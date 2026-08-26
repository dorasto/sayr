# form

2026-08-26, strategy: transformation engine (hand-migrated, no shadcn golden pair exists for this file — it is react-hook-form's shadcn wrapper, not a radix-golden-tracked ui/ component). Depends on Wave A's `label.tsx` (now a native `<label>`, no primitive). Verdict: migrated cleanly, one `Slot` composition converted to `useRender` + `mergeProps`.

## Changed

- `packages/ui/src/components/form.tsx`
  - Removed `import type * as LabelPrimitive from "@radix-ui/react-label"` and `import { Slot } from "@radix-ui/react-slot"`.
  - Added `import { mergeProps } from "@base-ui/react/merge-props"` and `import { useRender } from "@base-ui/react/use-render"`.
  - `FormLabel` (line 83): typed against `React.ElementRef<typeof Label>` / `React.ComponentPropsWithoutRef<typeof Label>` instead of `typeof LabelPrimitive.Root` — `Label` (from `@repo/ui/components/label`, Wave A) is now a plain `React.forwardRef<HTMLLabelElement, ...>`, so this just follows the ref/props type to its new source. No JSX or class changes; `Label` was already being rendered here, only the type annotation referenced the old Radix type.
  - `FormControl` (line 92): this always unconditionally slotted its props onto its single child (Radix `Slot`, not an `asChild`-toggle) — the "manual Slot idiom" from `universal-patterns.md`. Rewritten as:
    ```tsx
    const FormControl = React.forwardRef<
    	HTMLElement,
    	React.ComponentPropsWithoutRef<"div"> & { children: React.ReactElement }
    >(({ children, ...props }, ref) => {
    	const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    	return useRender({
    		render: children,
    		ref,
    		props: mergeProps<"div">(
    			{
    				id: formItemId,
    				"aria-describedby": !error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`,
    				"aria-invalid": !!error,
    			} as React.ComponentProps<"div">,
    			props
    		),
    	});
    });
    ```
    `render: children` reproduces Slot's "merge onto my single child" behavior (there is no `render` prop on the public `FormControl` API — the consumer's single child, e.g. `<Input {...field} />`, plays that role instead, same as it always merged onto Slot's child). The `id`/`aria-describedby`/`aria-invalid` values and precedence are unchanged from the original.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/form.tsx` → clean.

## Left alone

- `packages/ui/src/components/label.tsx` — already migrated in Wave A, not reopened here beyond following its new exported types.
- All consumers of `Form`/`FormControl`/`FormLabel`/etc. across `apps/start` — out of scope for this batch (consumer-props sweep is a separate pass); none of `FormControl`'s public props changed (still `children` + a single-child requirement), so no consumer call-site updates are expected to be needed, but they were not audited here.

## Behavior changes

None expected. `useRender({ render: children, ... })` merges the same id/aria-* props onto the same single child element that `<Slot>` did; `mergeProps` follows the same "rightmost/explicit wins" semantics as Radix's `slottable` prop merge for the props this component sets (it doesn't rely on Radix's event-handler-chaining nuances here, since the original never passed handlers through this path).

## Verify by hand

1. Open any form with validation (e.g. an admin settings form) and trigger a field error — confirm the associated `<Label>` gets `text-destructive` styling and the input gets `aria-invalid="true"` plus `aria-describedby` pointing at both the description and message ids.
2. Tab into a field without an error — confirm `aria-describedby` points only at the description id (no message id appended).
3. Click a form label — confirm focus moves to the paired input via `htmlFor`.
4. Confirm the wrapped child (e.g. `<Input>`, `<Select>`, `<Textarea>`) still receives its own props/ref/`onChange` from react-hook-form's `field` spread untouched — `FormControl` should be invisible in the DOM (no extra wrapper element renders).
