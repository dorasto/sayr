# label

2026-08-26, strategy: hard-rule replacement (no Base UI counterpart) — Label is now a native `<label>` with the exact same classes and click-selection behavior as the Radix `Label.Root` it replaced.

## Changed

- `packages/ui/src/components/label.tsx`
  - Removed `import * as LabelPrimitive from "@radix-ui/react-label"`.
  - Replaced `<LabelPrimitive.Root>` with a plain `<label>` element (line 25). Base UI has no Label primitive per SKILL.md hard rules.
  - Manually replicated Radix `Label.Root`'s only behavior (verified against `@radix-ui/react-label@2.1.7` source): an `onMouseDown` handler that no-ops when the mousedown target is inside `button, input, select, textarea`, and otherwise calls the consumer's `onMouseDown` then `preventDefault()`s on `event.detail > 1` (i.e. suppresses text selection on rapid double/triple clicks on the label text, but never interferes with clicking an interactive control inside the label).
  - `labelVariants` (cva, `variant: default | heading | subheading | description`) is untouched — this file was customized vs the shadcn "default" style golden (which has no `variant` prop / cva variants at all), so the customization was preserved verbatim.
  - Added `// biome-ignore lint/a11y/noLabelWithoutControl: ...` above the `<label>` — Biome's static a11y check can't see that `htmlFor`/`children`/nested control are forwarded via `...props` on this generic wrapper (same pattern already used elsewhere in this package for `breadcrumb.tsx`/`carousel.tsx` where Biome is known to be wrong about a generic wrapper).
  - Kept `React.forwardRef<HTMLLabelElement, ...>` (ref target changed from the Radix element-ref type to the concrete DOM element type, since there's no primitive to infer it from anymore).
- Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/label.tsx` → clean.

## Left alone

- `packages/ui/src/components/form.tsx` and `button.tsx` import `label.tsx` but are explicitly out of scope for this batch (later wave) — not touched, not even opened for editing.

## Behavior changes

None. The native `<label>` plus the hand-copied `onMouseDown` handler reproduces Radix `Label.Root`'s behavior exactly (verified against the primitive's source, not just its docs).

## Verify by hand

1. Click directly on label text next to a checkbox/input: focus should move to the associated control (native `<label>`/`htmlFor` behavior, unchanged).
2. Rapidly triple-click a label's text: text should not get selected (mousedown-suppression still works).
3. Click a button/input that happens to be nested inside a label: no text-selection suppression should fire for that click (the `closest("button, input, select, textarea")` bail-out).
4. Visually check all four `variant` values (`default`, `heading`, `subheading`, `description`) still render with their original type scale/weight.
