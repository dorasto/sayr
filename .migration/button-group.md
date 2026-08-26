# button-group

2026-08-26. Legacy style (`default`) — classification-only against the
`ui.shadcn.com/r/styles/default/button-group.json` radix golden, then
hand-transformed the project's own file via the transformation engine.
Verdict: pristine wrapper (no customization beyond import-path aliasing),
migrated cleanly to Base UI's `useRender`/`mergeProps` idiom for its one
polymorphic part.

## Changed

- `packages/ui/src/components/button-group.tsx`
  - Classified against golden: identical to the stock `default` style except
    for the project's own import aliases (`@repo/ui/lib/utils`,
    `@repo/ui/components/separator` vs. the registry's `@/lib/utils`,
    `@/registry/default/ui/separator`) — no customization to preserve/replay.
  - Import (line 1-2): `import { Slot } from "@radix-ui/react-slot"` ->
    `import { mergeProps } from "@base-ui/react/merge-props"` +
    `import { useRender } from "@base-ui/react/use-render"`.
  - `ButtonGroupText` (line 41-55): was the Slot/`asChild` idiom
    (`const Comp = asChild ? Slot : "div"`). It's a `<div>`-based polymorphic
    part (not a button), so per `universal-patterns.md` this is the
    `useRender` + `mergeProps` case, not the `@base-ui/react/button`
    primitive — mirrors the pattern already established in this codebase's
    `breadcrumb.tsx` `BreadcrumbLink`:
    ```tsx
    function ButtonGroupText({ className, render, ...props }: useRender.ComponentProps<"div">) {
      return useRender({
        defaultTagName: "div",
        render,
        props: mergeProps<"div">(
          { className: cn("bg-muted shadow-xs ...", className) } as React.ComponentProps<"div">,
          props
        ),
      });
    }
    ```
    Classes are byte-for-byte unchanged; the `data-*`-in-object-literal cast
    pitfall from `universal-patterns.md` doesn't apply here (no `data-*` key
    in the literal), but the cast is kept anyway to match the established
    house pattern and because `className` alone still needs it to satisfy
    `mergeProps`'s generic.
  - `ButtonGroup` and `ButtonGroupSeparator` (untouched): neither used
    radix directly — `ButtonGroup` is a plain styled `<div>`, and
    `ButtonGroupSeparator` only wraps `@repo/ui/components/separator`, which
    was already migrated to `@base-ui/react/separator` in Wave A. No changes
    needed beyond the file-level import swap above.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" packages/ui/src/components/button-group.tsx` -> no matches.

## Left alone

- `packages/ui/src/components/separator.tsx` — already migrated in Wave A;
  only consumed here via `ButtonGroupSeparator`, not touched.
- Checked all consumers of `ButtonGroupText` for `asChild` usage
  (`grep -rl "ButtonGroupText" apps packages | xargs grep -l asChild`): one
  hit, `apps/start/src/components/pages/admin/settings/orgId/billing/billing-seat-management.tsx`,
  but its `asChild` occurrences are on `AlertDialogTrigger`/
  `AlertDialogTitle`, unrelated to `ButtonGroupText` — no consumer actually
  passes `asChild` to `ButtonGroupText`, so there is no known breakage from
  this file for the consumer sweep to pick up.

## Behavior changes

None. `ButtonGroup`/`ButtonGroupSeparator` render identically; `useRender` +
`mergeProps` on `ButtonGroupText` reproduces the same default-tag (`<div>`)
and class output as the old `Slot`/`asChild` idiom, and since no consumer
currently exercises the polymorphic path, there's nothing to regress.

## Verify by hand

1. Render a `<ButtonGroup>` with a couple of `<Button>`s and a
   `<ButtonGroupSeparator>` — confirm the group's rounded-corner joins and
   the separator's vertical bar still render correctly.
2. Render `<ButtonGroupText>123</ButtonGroupText>` inside a group — confirm
   background, padding, and border match pre-migration.
3. If/when a caller starts passing `render` to `ButtonGroupText` (the new
   polymorphism entry point replacing `asChild`), confirm the rendered
   element takes on the merged className/props rather than being wrapped in
   an extra `<div>`.
