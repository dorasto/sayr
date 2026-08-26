# dialog

2026-08-26. Legacy style (`default`, base `radix`, no `base-default` counterpart) — classification-only against the radix golden (`https://ui.shadcn.com/r/styles/default/dialog.json`), then hand-transformed via the transformation engine. File is CUSTOMIZED vs golden (own colors/radius, extra `showClose`/`preventDefaultFocus`/`overlay` props on `DialogContent`, `bg-popover` instead of `bg-background`) — customizations preserved, only primitives rewired.

## Changed

- `packages/ui/src/components/dialog.tsx` — full rewrite:
  - Import: `import * as DialogPrimitive from "@radix-ui/react-dialog"` → `import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"`.
  - `Dialog = DialogPrimitive.Root`, `DialogTrigger`, `DialogPortal`, `DialogClose`: bare re-exports, unchanged shape.
  - `DialogOverlay`: `Overlay` → `Backdrop` rename (part rename, no anatomy change). Class list: `data-[state=open]:animate-in` / `data-[state=closed]:animate-out` / `data-[state=closed]:fade-out-0` / `data-[state=open]:fade-in-0` → `data-open:` / `data-closed:`.
  - `DialogContent`: `Content` → `Popup`, no `Positioner` — this is a centered modal (per overlays.md/wrapper-shapes.md: "Centered modals (dialog/alert-dialog) use Popup WITHOUT a Positioner"; also confirmed Base UI's Dialog has no `positioner/` part at all, only `backdrop/close/description/popup/portal/root/title/trigger/viewport`). The existing manual centering classes (`fixed left-[50%] top-[50%] ... translate-x-[-50%] translate-y-[-50%]`) needed no change — they were already doing the centering by hand, matching Base UI's own approach.
    - `onOpenAutoFocus={preventDefaultFocus ? (e) => e.preventDefault() : undefined}` → `initialFocus={preventDefaultFocus ? false : undefined}` (per overlays.md: `onOpenAutoFocus` moved to Popup's `initialFocus`, where `false` = don't move focus, matching the old `preventDefault()` behavior exactly).
    - Class list state selectors re-keyed the same way as the overlay (`data-[state=open/closed]:*` → `data-open:`/`data-closed:`); `showClose`/`preventDefaultFocus`/`overlay` custom props kept verbatim.
    - `DialogPrimitive.Close`'s class list (`data-[state=open]:bg-accent data-[state=open]:text-muted-foreground`) mechanically re-keyed to `data-open:*` too — left as-is functionally (not verified whether Radix's `Close` ever actually received `data-state` here in the first place; out of scope to investigate a pre-existing possible no-op, only did the standard rename).
  - `DialogHeader`/`DialogFooter`: plain `<div>` wrappers, untouched (no Radix involvement).
  - `DialogTitle`, `DialogDescription`: bare rewires, `.Title`/`.Description` part names unchanged.
  - All `displayName` assignments switched from reading `DialogPrimitive.Part.displayName` to literal strings (e.g. `"DialogContent"`) — the restructured `Popup`/`Backdrop` primitives don't carry over meaningfully-named `displayName`s the way the old flat structure implied.
- Leftover sweep: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" dialog.tsx` → clean.

## Left alone

- No sibling files needed changes.

## Behavior changes

- **Consumer API breaks (expected, out of batch scope).** `DialogClose`/`DialogTitle`/`DialogDescription` no longer accept `asChild` (→ `render`). Confirmed breaks in files outside this batch, not touched:
  - `tomui/tabbed-dialog.tsx`: three `DialogClose` call sites (lines ~624, 689, 813) using `asChild`.
  - `tomui/split-dialog.tsx`: one `DialogTitle` call site (~line 152) using `asChild`.
  - `apps/start`... not checked (out of `packages/ui` tsc scope) — recommend a repo-wide grep for `DialogClose asChild`/`DialogTitle asChild`/`DialogDescription asChild` before/alongside the consumer-props sweep.
  - `adaptive-dialog.tsx` (in `packages/ui`) already had 3 pre-existing, unrelated ref-typing errors before this batch (`ForwardedRef` vs Base UI's narrower `Ref<never>`, called out in the task brief as pre-existing/not mine). This migration adds one **new** error there (line 37): `Dialog.Root`'s `children` prop now also accepts a payload-render function (`PayloadChildRenderFunction<unknown>`) which doesn't collapse cleanly into `ReactNode` the way `adaptive-dialog.tsx` currently uses it. Flagged, not fixed — `adaptive-dialog.tsx` is outside this batch.
- Enter/exit now keyed off `data-open`/`data-closed` instead of `data-state=open|closed` — same visual animation, selector rename only.
- `modal` defaults to `true` on both Radix and Base UI `Dialog.Root` — no behavior change there.

## Verify by hand

- Open a dialog: overlay should fade in behind it, dialog should fade/zoom in centered, and (with default `preventDefaultFocus = true`) focus should NOT auto-jump into the dialog's first focusable element on open (matches the old `preventDefault()`).
- Set `preventDefaultFocus={false}` on a test dialog: focus should move into the dialog on open (Base UI's default `initialFocus` behavior).
- Close via the X button, Escape, and an outside click; each should close and return focus to the trigger.
- Toggle `overlay={false}` on a call site: dialog should render with no backdrop, same as before.
