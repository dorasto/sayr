# command

2026-08-26, strategy: transformation engine (hand-migrated — `command.tsx` wraps `cmdk`, a non-shadcn/non-radix third-party library, so no shadcn golden pair applies to most of the file; only its `CommandDialog` export composes the already-migrated `dialog.tsx`). Depends on Wave A's `dialog.tsx` (now `@base-ui/react/dialog`). Verdict: migrated cleanly — the Dialog composition itself needed no structural changes (the wrapper's custom `overlay`/`preventDefaultFocus` props on `DialogContent` already match the Wave A API 1:1), only the type import feeding `CommandDialog`'s props needed replacing.

## Changed

- `packages/ui/src/components/command.tsx`
  - Removed `import type { DialogProps } from "@radix-ui/react-dialog"`.
  - `CommandDialog`'s props type (line 24) changed from `DialogProps & { showOverlay?: boolean }` to:
    ```tsx
    Omit<React.ComponentProps<typeof Dialog>, "children"> & {
    	children?: React.ReactNode;
    	showOverlay?: boolean;
    }
    ```
    Deriving straight from `React.ComponentProps<typeof Dialog>` (where `Dialog` = `DialogPrimitive.Root` from the already-migrated `dialog.tsx`) was tried first, but `DialogRoot` is generic over a `Payload` type and its `children` prop is typed `React.ReactNode | PayloadChildRenderFunction<Payload>` — that union isn't assignable to plain `ReactNode`, which is what `<Command>{children}</Command>` requires below. `children` is explicitly re-typed as `React.ReactNode` (its actual usage here) and the rest of `Dialog.Root`'s props (`open`, `onOpenChange`, `modal`, etc.) pass through unchanged via the `Omit`.
  - The JSX composition itself (`<Dialog>` → optional `<DialogOverlay>` → `<DialogContent overlay={false} preventDefaultFocus={false}>` → cmdk `<Command>`) is **unchanged** — `DialogContent`'s `overlay` (skip its own internal Backdrop) and `preventDefaultFocus` (maps to Base UI's `initialFocus={false}`) props already exist on the Wave A `dialog.tsx` wrapper with the same names/semantics `command.tsx` was already relying on, so no call-site rewiring was needed beyond the type fix above.
  - Leftover scan: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" packages/ui/src/components/command.tsx` → clean.

## Left alone

- **`cmdk` itself is NOT radix and was intentionally not touched**, per SKILL.md's hard rule ("NEVER touch non-radix libraries or their wrappers: cmdk (command), vaul (drawer), sonner, input-otp, react-day-picker (calendar), recharts (chart)"). Every `CommandPrimitive.*` part (`Command`, `Command.Input`, `Command.List`, `Command.Empty`, `Command.Group`, `Command.Separator`, `Command.Item`), its `[cmdk-*]` attribute-selector classes, and the `from "cmdk"` import are all untouched and expected to remain as-is.
- `packages/ui/src/components/dialog.tsx` — already migrated in Wave A; not reopened here beyond consuming its exported types/props.
- Consumers of `CommandDialog`/`Command*` across `apps/start` (e.g. the command palette) — out of scope for this batch; `CommandDialog`'s public prop surface (`showOverlay`, plus whatever `Dialog.Root` accepts: `open`, `onOpenChange`, `modal`, ...) is unchanged, so no call-site updates are expected, but they were not audited here.

## Behavior changes

None. The Dialog composition and its props (`overlay`, `preventDefaultFocus`, `showOverlay`) behave exactly as they did against the Wave A `dialog.tsx`, since `command.tsx` was already written against that wrapper's custom API.

## Verify by hand

1. Open the command palette (Cmd+K or whatever trigger renders `CommandDialog`) — confirm it opens centered, backdrop-blurred per the custom `backdrop-blur-none` override, and focus lands in the search input (not on the dialog's default first-tabbable element — `preventDefaultFocus={false}` should still suppress Base UI's `initialFocus`).
2. Type to filter items — confirm `cmdk`'s own filtering/keyboard nav (up/down/enter) still works untouched.
3. Press Escape or click outside — confirm the dialog closes normally.
4. Confirm the double z-index stacking (`z-[999999999]` on both the standalone `DialogOverlay` and `DialogContent`) still renders the palette above other overlays in the app.
