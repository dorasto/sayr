# breadcrumb

Legacy style (`default`), engine transform. Golden radix reference fetched from
`https://ui.shadcn.com/r/styles/default/breadcrumb.json` for classification only.
Verdict: customized wrapper (`BreadcrumbList`'s gap classes are `gap-1` with no
responsive step, vs golden's `gap-1.5 sm:gap-2.5`) — preserved verbatim; only
`BreadcrumbLink`'s `asChild`/`Slot` idiom needed rewiring (the only Radix import in this
file was `@radix-ui/react-slot`, not a Breadcrumb-specific primitive — Breadcrumb has no
Radix primitive of its own, it's all plain HTML elements).

## Changed

- `src/components/breadcrumb.tsx`:
  - Import swapped: `import { Slot } from "@radix-ui/react-slot"` ->
    `import { mergeProps } from "@base-ui/react/merge-props"` +
    `import { useRender } from "@base-ui/react/use-render"`.
  - `BreadcrumbLink` rewritten from the manual Slot idiom (`const Comp = asChild ? Slot :
    "a"`) to `useRender` + `mergeProps`, following the WORKED EXAMPLE in
    universal-patterns.md verbatim (this is the exact case that example documents —
    breadcrumb link is the canonical non-button polymorphic component): went from a
    `React.forwardRef<HTMLAnchorElement, ... & { asChild?: boolean }>` component to a
    plain function `BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<"a">)`.
    Public API changed: `asChild` prop is gone, replaced by Base UI's `render` prop
    (`<BreadcrumbLink render={<Link to="..." />}>text</BreadcrumbLink>` instead of
    `<BreadcrumbLink asChild><Link to="...">text</Link></BreadcrumbLink>`).
  - Applied the mergeProps pitfall fix from universal-patterns.md: the internal
    `{ className: ... }` object literal is cast `as React.ComponentProps<"a">` before
    being passed to `mergeProps`, since a bare object literal with `data-*`-style keys
    (not present here, but the pattern is followed for consistency/safety) fails
    TypeScript's excess-property checking outside JSX.
  - All other parts (`Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbPage`,
    `BreadcrumbSeparator`, `BreadcrumbEllipsis`) are plain HTML wrappers with no Radix
    dependency — left untouched, including the project's customized `gap-1`
    (`BreadcrumbList`) which diverges from golden's `gap-1.5 sm:gap-2.5`.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/breadcrumb.tsx` ->
    clean.

## Left alone

- `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbPage`,
  `BreadcrumbSeparator`, `BreadcrumbEllipsis` — no Radix dependency, nothing to migrate.

## Behavior changes

- `BreadcrumbLink`'s public prop API changed from `asChild` (boolean + single child) to
  `render` (element or render-function prop), per Base UI's `useRender` convention.
  Repo-wide grep for `BreadcrumbLink` found **zero consumers** of this component anywhere
  in `apps/`/`packages/` (it's exported but not currently imported/used), so this is a
  clean signature change with no known call-site impact today.

## Verify by hand

- Render a `<Breadcrumb>` with `<BreadcrumbLink href="/">Home</BreadcrumbLink>`: renders
  as a plain anchor with hover color transition.
- Render `<BreadcrumbLink render={<a href="/foo" />}>Foo</BreadcrumbLink>`: confirm the
  rendered element is still an `<a>` with the link wrapper's classes merged onto it (not
  duplicated/dropped).
- `BreadcrumbPage`/`BreadcrumbSeparator`/`BreadcrumbEllipsis` are unaffected — quick
  visual check only.
