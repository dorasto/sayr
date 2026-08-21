// A non-panel-system drawer: non-modal (background stays interactive, no
// scrim), portalled into a LOCAL relative container instead of <body> (so
// it's confined to a route's own content area, not a full-viewport
// overlay), and paired with Base UI's native Indent/IndentBackground
// primitives so the main content it sits beside/above animates to make
// room as the drawer opens — a left- or right-side push on desktop
// (`side`, default "right"), a genuine vertical push (not an
// overlay-with-partial-visibility) on mobile, both driven by the same
// `[data-active]` state Base UI applies automatically.
// `width`/`height` are shared between `IndentDrawerRegion` (the "make
// room" side) and `IndentDrawerContent` (the drawer's own size) via CSS
// custom properties, set from the same two props on both — pass matching
// values to each so they never drift out of sync.
//
// Built directly on `@base-ui/react/drawer` — Vaul's native replacement
// (Vaul is archived). Base UI's Drawer natively supports nesting (a
// second `IndentDrawer` rendered inside an outer one's content) — nothing
// extra needed for that, it's inherent to the primitives.

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import * as React from "react";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "../../lib/utils";

export type IndentDrawerSide = "left" | "right";

// Re-shaped (not re-exported) from base-ui's own DrawerRoot.Actions so
// consumers driving `actionsRef` imperatively (e.g. Page's drawer-close
// handle registry) don't need `@base-ui/react` as their own dependency —
// only packages/ui does.
export type IndentDrawerActions = { unmount: () => void; close: () => void };

export const IndentDrawerProvider = DrawerPrimitive.Provider;

export function IndentDrawerIndentBackground({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.IndentBackground>) {
  return (
    <DrawerPrimitive.IndentBackground
      data-slot="indent-drawer-background"
      className={cn("absolute inset-0", className)}
      {...props}
    />
  );
}

export interface IndentDrawerSizeProps {
  /** Desktop: how far the region is pushed left / the drawer's own width. @default "380px" */
  width?: string;
  /** Mobile: how much vertical room is made below the region / the sheet's own max height. @default "38dvh" */
  height?: string;
}

/** Wraps a route's main content — gets `data-active` whenever a paired `IndentDrawer` below it is open. */
export function IndentDrawerRegion({
  className,
  side = "right",
  width = "380px",
  height = "38dvh",
  mobileZoom,
  style,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Indent> &
  IndentDrawerSizeProps & {
    side?: IndentDrawerSide;
    /**
     * Mobile only, opt-in: also shrink the region's content by this factor
     * (e.g. `0.85`) while the drawer is open, on top of the vertical push
     * from `height`. Uses CSS `zoom` (real reflow, not a blurry `transform:
     * scale`). Omit entirely for plain push-only mobile behavior — the
     * default, and enough for most panels; reach for this only when the
     * page's own content is tall enough that a pushed-down view alone
     * still doesn't show enough of it.
     */
    mobileZoom?: number;
  }) {
  return (
    <DrawerPrimitive.Indent
      data-slot="indent-drawer-region"
      style={
        {
          "--indent-drawer-width": width,
          "--indent-drawer-height": height,
          ...(mobileZoom !== undefined
            ? { "--indent-drawer-zoom": mobileZoom }
            : {}),
          ...style,
          // The conditional spread above makes this a union of object
          // shapes, and TS rejects `as React.CSSProperties` directly on a
          // union as "insufficiently overlapping" — go through `unknown`
          // first, same as this codebase's other CSS-custom-property casts.
        } as unknown as React.CSSProperties
      }
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        "transition-[margin] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[margin,zoom]",
        // mobile: push down by the sheet's own height plus a small real
        // gap (0.5rem) — on mobile the Popup is flush to the screen edges
        // with no padding of its own (see IndentDrawerContent), so unlike
        // desktop below, no extra term is needed to cancel anything out;
        // the 0.5rem here is the entire, real, visible gap. Side-agnostic
        // — mobile always pushes down regardless of `side`.
        "max-md:data-active:mb-[calc(var(--indent-drawer-height)+0.5rem)]",
        // mobile, opt-in: additionally shrink content via `zoom` — only
        // emitted (and only takes effect) when `mobileZoom` is passed, so a
        // page that doesn't set it gets plain push with no shrink.
        mobileZoom !== undefined &&
          "max-md:data-active:zoom-(--indent-drawer-zoom)",
        // desktop: push content away from whichever side the drawer opens
        // on. +1.5rem, not +0.75rem: the Popup is positioned by
        // `justify-end`/`justify-start` + IndentDrawerContent's Viewport
        // `p-3` padding, which shifts the Popup's ENTIRE box (both edges
        // together, not just the far one) by 0.75rem away from the
        // container's true edge — so without accounting for that, this
        // margin and the Popup's near edge land at the same position
        // MINUS that 0.75rem, i.e. the Popup actually overlaps the pushed
        // content by 0.75rem instead of sitting flush against it. The
        // first 0.75rem here cancels that back to flush; the remaining
        // 0.75rem is the real, visible gap — deliberately equal to the
        // Viewport's own p-3 (the gap from the Popup's FAR edge to the
        // screen/container edge), so the inset reads the same on both
        // sides of the panel instead of a smaller gap on the content
        // side. Re-verify with getBoundingClientRect() on the real
        // rendered boxes after any change here, not by eyeballing a
        // screenshot; the two boxes are positioned by unrelated CSS
        // mechanisms that happen to need to agree, and a route's own
        // content padding can visually read as "the gap" even when this
        // margin contributes nothing or is actually overlapping.
        side === "left"
          ? "md:data-active:ml-[calc(var(--indent-drawer-width)+1.5rem)]"
          : "md:data-active:mr-[calc(var(--indent-drawer-width)+1.5rem)]",
        className,
      )}
      {...props}
    />
  );
}

export interface IndentDrawerProps extends Omit<
  React.ComponentProps<typeof DrawerPrimitive.Root>,
  "modal" | "swipeDirection"
> {
  modal?: React.ComponentProps<typeof DrawerPrimitive.Root>["modal"];
  swipeDirection?: React.ComponentProps<
    typeof DrawerPrimitive.Root
  >["swipeDirection"];
  /** Which side the drawer opens from on desktop. Mobile always opens from the bottom. @default "right" */
  side?: IndentDrawerSide;
}

/** Root — non-modal by default, picks the bottom/left/right swipe direction from the current breakpoint + `side`. */
export function IndentDrawer({
  modal = false,
  swipeDirection,
  side = "right",
  disablePointerDismissal = true,
  children,
  ...props
}: IndentDrawerProps) {
  const isMobile = useIsMobile();
  return (
    <DrawerPrimitive.Root
      modal={modal}
      disablePointerDismissal={disablePointerDismissal}
      swipeDirection={swipeDirection ?? (isMobile ? "down" : side)}
      {...props}
    >
      {children}
    </DrawerPrimitive.Root>
  );
}

export const IndentDrawerTrigger = DrawerPrimitive.Trigger;
export const IndentDrawerClose = DrawerPrimitive.Close;

// Desktop-only drag-to-resize handle, pinned to the Popup's near edge (the
// one facing the pushed content). Deliberately has zero knowledge of any
// state store — it just measures the Popup's own rendered width at drag
// start and reports deltas via `onResize`; the caller (Page, in
// apps/start) decides where that number lives. Reading the REAL rendered
// width at drag start (instead of trusting the `width` prop) is what makes
// this work regardless of whether `width` was ever a fixed px value or a
// percentage — no need to parse or reconcile either.
function IndentDrawerResizeHandle({
  side,
  onResize,
  minWidth,
  maxWidth,
}: {
  side: IndentDrawerSide;
  onResize: (widthPx: number) => void;
  minWidth: number;
  maxWidth: number;
}) {
  const handleRef = React.useRef<HTMLDivElement>(null);
  // Tracks the active drag's teardown so unmounting mid-drag (e.g. the
  // drawer closes while the user is still holding the handle) still
  // removes the document listeners and restores body styles — otherwise
  // they're stuck until another drag happens to clean up after itself.
  const cleanupRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => () => cleanupRef.current?.(), []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const popup = handleRef.current?.closest<HTMLElement>(
      '[data-slot="indent-drawer-popup"]',
    );
    if (!popup) return;
    event.preventDefault();
    // Popup also has its own swipe-to-dismiss pointer tracking (from
    // `swipeDirection` on IndentDrawer's Root) — without stopping
    // propagation here, a drag on this handle bubbles up and gets read by
    // BOTH the resize logic below AND Base UI's own swipe gesture at the
    // same time, compounding into a width that doesn't match the actual
    // pointer movement (reproduced live: a 100px drag over-shot to
    // +200px+). Capture phase on the move/up listeners below for the same
    // reason — belt and suspenders against Base UI's own listeners
    // (registered in bubble phase) seeing them first.
    event.stopPropagation();

    const startWidth = popup.getBoundingClientRect().width;
    const startX = event.clientX;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent: PointerEvent) => {
      moveEvent.stopPropagation();
      const delta = moveEvent.clientX - startX;
      // side="right": handle sits on the popup's LEFT edge, dragging left
      // (negative delta) should grow the panel, so width = start - delta.
      // side="left": mirrored.
      const next = side === "right" ? startWidth - delta : startWidth + delta;
      onResize(Math.round(Math.min(maxWidth, Math.max(minWidth, next))));
    };
    // once:true on pointerup alone leaves this dangling if the browser
    // fires pointercancel instead (e.g. the gesture gets taken over by
    // scroll/back-navigation) — pointercancel gets the same cleanup.
    const cleanup = () => {
      document.removeEventListener("pointermove", handleMove, true);
      document.removeEventListener("pointerup", handleUp, true);
      document.removeEventListener("pointercancel", handleUp, true);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      cleanupRef.current = null;
    };
    const handleUp = (upEvent: PointerEvent) => {
      upEvent.stopPropagation();
      cleanup();
    };
    cleanupRef.current = cleanup;
    document.addEventListener("pointermove", handleMove, true);
    document.addEventListener("pointerup", handleUp, true);
    document.addEventListener("pointercancel", handleUp, true);
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- drag handle, not a semantic control
    <div
      ref={handleRef}
      onPointerDown={handlePointerDown}
      data-slot="indent-drawer-resize-handle"
      className={cn(
        // Fully inside the Popup's own box (not straddling the edge via a
        // negative translate) on purpose — the Popup has overflow-hidden
        // for its rounded corners, which would silently clip any part of
        // the handle that overflowed past the edge.
        "absolute top-0 bottom-0 z-10 w-3 max-md:hidden",
        "cursor-col-resize touch-none select-none",
        "after:absolute after:inset-y-0 after:w-px after:bg-transparent after:transition-colors",
        "hover:after:bg-primary/40 active:after:bg-primary/60",
        side === "right" ? "left-0 after:left-0" : "right-0 after:right-0",
      )}
    />
  );
}

export function IndentDrawerContent({
  container,
  className,
  side = "right",
  width = "380px",
  height = "38dvh",
  children,
  resizable = false,
  onResize,
  minWidth = 280,
  maxWidth = 720,
}: {
  container?: HTMLElement | null;
  className?: string;
  side?: IndentDrawerSide;
  children: React.ReactNode;
  /** Desktop-only drag-to-resize on the popup's near edge. Requires `onResize`. @default false */
  resizable?: boolean;
  /** Called with the new width in px while dragging. Required for `resizable`. */
  onResize?: (widthPx: number) => void;
  /** @default 280 */
  minWidth?: number;
  /** @default 720 */
  maxWidth?: number;
} & IndentDrawerSizeProps) {
  const sizeVars = {
    "--indent-drawer-width": width,
    "--indent-drawer-height": height,
  } as React.CSSProperties;

  return (
    <DrawerPrimitive.Portal container={container}>
      {/* pointer-events-none on the viewport + pointer-events-auto only on
			    the popup below is what makes this genuinely non-modal — clicks
			    outside the popup's own box pass straight through to whatever's
			    behind it, no backdrop, no focus trap. */}
      <DrawerPrimitive.Viewport
        style={sizeVars}
        className={cn(
          "pointer-events-none absolute inset-0 z-40 flex",
          "max-md:items-end max-md:justify-center",
          // p-3 is what makes the desktop drawer "float" — Popup stretches
          // to fill this padded box instead of the full edge-to-edge
          // container, so it never touches the top/right/bottom edges.
          // items-stretch (always full height) is deliberate — a drawer
          // that shrinks to its own content reads as a small floating
          // popover rather than a drawer. Long content still scrolls
          // internally via Content's overflow-y-auto below.
          //
          // Uniform p-3 on purpose, NOT asymmetric: for a fixed-width,
          // justify-end/justify-start item, only the padding on the
          // justify side affects its position at all. So the near edge
          // (facing pushed content) can't be tuned via padding
          // independently of the far edge (facing the screen/container
          // edge) — both move together. Matching the Popup's near edge to
          // IndentDrawerRegion's push margin lives in that margin's own
          // calc above, not here — don't try to "fix" the gap by making
          // this padding asymmetric.
          "md:items-stretch md:p-3",
          side === "left" ? "md:justify-start" : "md:justify-end",
        )}
      >
        <DrawerPrimitive.Popup
          data-slot="indent-drawer-popup"
          className={cn(
            // group/popup: lets nested content (via IndentDrawerContent
            // rendered inside this one's children) dim/hide itself while
            // this drawer sits behind a nested one.
            "group/popup relative pointer-events-auto flex flex-col overflow-hidden border bg-popover text-popover-foreground shadow-lg outline-none",
            "transition-[transform,opacity,zoom] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
            // mobile: bottom sheet, flush to the screen edges
            "max-md:max-h-(--indent-drawer-height) max-md:w-full max-md:rounded-t-xl",
            "max-md:transform-[translateY(var(--drawer-swipe-movement-y))]",
            "max-md:data-starting-style:transform-[translateY(100%)]",
            "max-md:data-ending-style:transform-[translateY(100%)]",
            // desktop: floating card, inset from every edge by the
            // Viewport's padding above. shadow-lg (not -2xl) on purpose —
            // matches every other floating surface in this app (Popover,
            // DropdownMenu, Sheet all cap at shadow-md/-lg); shadow-2xl
            // read as visibly heavier than the rest of the UI's flatter,
            // borderless-in-dark-mode look and stood out as "off".
            "md:w-(--indent-drawer-width) md:rounded-xl",
            "md:transform-[translateX(var(--drawer-swipe-movement-x))]",
            side === "left"
              ? "md:data-ending-style:transform-[translateX(-100%)] md:data-starting-style:transform-[translateX(-100%)]"
              : "md:data-ending-style:transform-[translateX(100%)] md:data-starting-style:transform-[translateX(100%)]",
            // Nested drawers (Base UI native): when a nested drawer is
            // open on top, dim and slightly shrink this one so it reads
            // as "behind" — `zoom` not `scale`, because the slide
            // transform above already uses raw `transform` and composing
            // a separate `scale-*` utility would silently clobber it.
            "data-nested-drawer-open:[zoom:0.96] data-nested-drawer-open:opacity-60",
            className,
          )}
        >
          {resizable && onResize && (
            <IndentDrawerResizeHandle
              side={side}
              onResize={onResize}
              minWidth={minWidth}
              maxWidth={maxWidth}
            />
          )}
          <div
            className="mx-auto mt-2 hidden h-1.5 w-10 shrink-0 rounded-full bg-muted max-md:block"
            aria-hidden
          />
          <DrawerPrimitive.Content className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-0">
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}
