# alert-dialog

2026-08-26. Strategy: legacy style, classification-only (no replay) — fetched
`https://ui.shadcn.com/r/styles/default/alert-dialog.json` as radix-golden
solely to detect customization, then hand-transformed the project's own
`alert-dialog.tsx` on `@base-ui/react/alert-dialog`, preserving its exact
classes. Verdict: migrated clean, zero new typecheck errors, leftover-radix
grep clean.

## Changed

- `packages/ui/src/components/alert-dialog.tsx` — full primitive swap:
  - Import: `import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"`
    -> `import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"`
    (individual radix package -> unified Base UI subpath, per
    universal-patterns.md's import table).
  - `AlertDialog` / `AlertDialogTrigger` / `AlertDialogPortal` — same bare
    reassignment pattern, now off `AlertDialogPrimitive.Root/Trigger/Portal`
    (Base UI alert-dialog reuses Dialog's Portal under the hood; confirmed via
    `@base-ui/react/alert-dialog/index.parts.d.ts`).
  - `AlertDialogOverlay` (line 15-28): `AlertDialogPrimitive.Overlay` ->
    `AlertDialogPrimitive.Backdrop`. Class string unchanged except
    `data-[state=open]:` / `data-[state=closed]:` -> `data-open:` / `data-closed:`
    (class-mapping.md data-attribute table). Kept the exact double-space typo
    between `bg-black/80` and the data-attribute classes — that's pre-existing
    in the project's own file, preserved verbatim per the legacy-style rule.
  - `AlertDialogContent` (line 30-46): `AlertDialogPrimitive.Content` ->
    `AlertDialogPrimitive.Popup`, still wrapped in `AlertDialogPortal` +
    `AlertDialogOverlay` (centered modal, no Positioner — per overlays.md).
    Same data-attribute rename as Overlay. No other class changes.
  - `AlertDialogTitle` / `AlertDialogDescription` (line 58-72): primitive swap
    only (`AlertDialogPrimitive.Title` / `.Description`), classes untouched
    (no data-attribute selectors in either).
  - `AlertDialogAction` (line 77-83): Base UI's alert-dialog has **no Action
    part** (confirmed against
    `node_modules/@base-ui/react/alert-dialog/index.parts.d.ts` — only Root,
    Trigger, Portal, Backdrop, Popup, Title, Description, Close, Viewport,
    Handle are exported). Rewritten as a plain `<button>` styled with the
    project's existing `buttonVariants()` (unchanged classes) — matches the
    documented fallback in overlays.md ("no Base UI part... wrapper renders a
    styled `<button>`"), and matches what the current shadcn base-registry
    (`base-nova` style, fetched for cross-reference only, not replayed) does
    structurally (they use their `Button` component; this project's original
    file used `buttonVariants()` directly on the primitive, not the `Button`
    component, so I kept that same shape rather than pulling in `Button`,
    which would add tooltip/asChild machinery the original never had).
  - `AlertDialogCancel` (line 85-95): `AlertDialogPrimitive.Cancel` ->
    `AlertDialogPrimitive.Close` (Base UI's real rename target for Cancel, per
    overlays.md and the coverage matrix in universal-patterns.md). Classes
    unchanged (`buttonVariants({ variant: "outline" })`, `"mt-2 sm:mt-0"`).
    No `asChild`/`render` needed anywhere in this file — the original never
    used `asChild` on Action/Cancel (it applied `buttonVariants()` classes
    directly to the Radix primitives, which already render `<button>`), so
    there was no asChild->render conversion to perform here, contrary to the
    task brief's guess.
  - `displayName` assignments switched from chaining into the primitive
    (`AlertDialogPrimitive.Overlay.displayName`) to hardcoded string literals
    (`"AlertDialogOverlay"`, etc.) — matching the precedent already set by the
    sibling `dialog.tsx` (Wave A/B), since Base UI's aliased re-exports
    (`Backdrop`/`Popup`/`Close` are actually `DialogBackdrop`/`DialogPopup`/
    `DialogClose` under an alert-dialog-specific name) don't carry a
    `.displayName` matching the wrapper's own name.

Leftover-radix scan on this component's file:
`grep -n "radix-ui\|@radix-ui" alert-dialog.tsx` -> no matches (clean).

## Left alone

- `packages/ui/src/components/button.tsx` — already migrated (Wave A/B), only
  consumed here for `buttonVariants`; not touched.
- `packages/ui/src/components/dialog.tsx` — sibling overlay wrapper, already
  migrated (Wave A/B); used only as a style precedent (displayName pattern,
  `data-open`/`data-closed` class-rename convention), not touched.
- `packages/ui/src/components/_golden-sidebar-tmp.tsx` — untracked scratch
  file from a concurrent agent migrating `sidebar.tsx`; not touched, not read
  for content beyond noticing it exists in `git status`.
- Ten app-code consumers of `AlertDialog*` (see below) — out of scope for this
  file-scoped task; NOT edited, but flagged because some of them pass
  Radix-only `asChild` to parts that no longer support it.
- `components.json` style is `default` (legacy, no `base-default` variant to
  flip to) — per SKILL.md, whole-project mode on a legacy style still doesn't
  flip the style field; that flag from the Wave A/B `dialog.tsx` migration
  (if raised then) still stands and isn't re-raised as new here.

## Behavior changes

- **Cancel default focus.** Radix AlertDialog focuses the `Cancel` button by
  default when the dialog opens (a11y default: Enter/Escape lands on the safe
  action). Base UI's `Popup` focuses the first tabbable element instead
  (documented in overlays.md); this wrapper does not set `initialFocus` to
  recreate the old behavior — matching what shadcn's own current base
  registry (`base-nova`, checked for reference) does, i.e. this delta is
  accepted upstream, not silently patched here either. Flagging per the hard
  rule: if this project wants Radix-parity, pass
  `initialFocus={cancelRef}` on `AlertDialogContent`'s underlying `Popup` (not
  wired up — would require exposing a ref prop through the wrapper).
- **"Click outside to dismiss" — confirmed preserved (no delta).** Both Radix
  `AlertDialog.Content` and Base UI `AlertDialog.Popup` intentionally have no
  outside-press/interact-outside dismissal by design (overlays.md: "Base UI
  AlertDialog is always modal and never closes on outside press by default").
  Nothing in this file enables it either way; behavior matches before/after.
- **`onOpenChange` signature.** Not exercised by this wrapper (it passes
  `...props` through untouched), but any consumer passing `onOpenChange` now
  receives `(open, eventDetails)` instead of `(open)` — Base UI's extra arg is
  additive, so existing single-arg consumers keep compiling and working
  unchanged unless they use `.length`/`arguments` introspection (none found).
- **`AlertDialogAction` is no longer a Radix-managed close.** Radix's
  `Action` primitive doesn't auto-close either (consumers already had to
  close manually), so no functional change — noting only because the DOM node
  changed from a Radix-`Primitive.button` wrapper to a bare `<button>`
  (functionally identical, same attributes/ref forwarding).

## Verify by hand

1. Open any confirm/destroy flow using `AlertDialog` (e.g. delete API key,
   delete task, leave org) — dialog should center-fade+zoom in exactly as
   before (no slide, matching the project's pre-existing customization versus
   the shadcn golden, which does include a slide that this file has never
   used).
2. Tab through the dialog on open — note focus lands on the first tabbable
   element (not necessarily Cancel); confirm this is acceptable or revisit the
   `initialFocus` flag above.
3. Click/tap outside the dialog and press no key — dialog must stay open in
   both the old and new build (no outside-dismiss regression either way).
4. Press Escape — dialog should still close (Root's `onOpenChange` receives
   reason `'escape-key'`; nothing in this wrapper cancels it).
5. Click Cancel — dialog closes, no console warnings about unknown DOM
   attributes.
6. Click Action — verify whatever `onClick` the consumer wired still fires and
   closes the dialog the way it always did (this wrapper does not manage
   closing on Action's behalf, same as before).

## Follow-up (not part of this file's scope, flagged for the consumer sweep)

Ten files import `AlertDialog*` parts; several pass Radix-only `asChild` to
parts that no longer implement it (Base UI ignores unknown `asChild` prop —
it will NOT merge onto the child, causing nested/duplicate interactive
elements at runtime, not a compile error):

- `apps/start/src/components/pages/admin/settings/user-settings-content.tsx:233,277` — `<AlertDialogTrigger asChild>`
- `apps/start/src/components/pages/admin/settings/orgId/billing/billing-seat-management.tsx:244` — `<AlertDialogTrigger asChild>`, plus `:255,258` — `<AlertDialogTitle asChild>` / `<AlertDialogDescription asChild>`
- `apps/start/src/components/console/system-api-keys.tsx:226` — `<AlertDialogTrigger asChild>`
- `apps/start/src/components/console/user-table.tsx:552` — `<AlertDialogTrigger asChild>`
- `apps/start/src/components/releases/release-discussion.tsx:441` — `<AlertDialogTitle asChild>`
- `apps/start/src/components/releases/status-updates/status-update-card.tsx:441` — `<AlertDialogTitle asChild>`
- `apps/start/src/components/tasks/task/timeline/timeline-comment.tsx:739,766` — `<AlertDialogTitle asChild>`
- `apps/start/src/components/shared/comments/comment-item.tsx:208` — `<AlertDialogTitle asChild>`
- `apps/start/src/components/public/public-comment-item.tsx:304` — `<AlertDialogTitle asChild>`
- `apps/start/src/components/settings/api-keys/key-details.tsx` — imports `AlertDialog*` parts, no `asChild` found on them.

These need the standard `asChild` -> `render` rewrite (per
universal-patterns.md's worked example) as part of the whole-project app-code
sweep; deliberately not touched here since this task was scoped to
`alert-dialog.tsx` only.

`N wrappers remain on Radix`: not computed here (out of scope for a
single-component report); run
`grep -rl "radix-ui\|@radix-ui" packages/ui/src/components` for the current
count across the project.
