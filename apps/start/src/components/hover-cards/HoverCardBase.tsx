import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@repo/ui/components/hover-card";
import { cn } from "@repo/ui/lib/utils";
import * as React from "react";

export interface HoverCardBaseProps {
  /** The element that triggers the hover card on mouse enter */
  trigger: React.ReactNode;
  /** The hover card content */
  children: React.ReactNode;
  /** When true, renders the trigger directly with no hover card */
  disabled?: boolean;
  /**
   * When true, forces the card closed without changing the component tree.
   * Use this to suppress the card while a sibling dropdown/popover is open.
   */
  forceClose?: boolean;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Delay in ms before the card opens. Default: 400 */
  openDelay?: number;
  /** Delay in ms before the card closes. Default: 100 */
  closeDelay?: number;
  defaultOpen?: boolean;
}

/**
 * Generic hover card wrapper that composes @repo/ui HoverCard primitives.
 * Uses internal controlled state so the tree is always stable — use
 * `forceClose` to suppress the card without remounting anything.
 */
export function HoverCardBase({
  trigger,
  children,
  disabled,
  forceClose = false,
  className,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  openDelay = 400,
  closeDelay = 100,
  defaultOpen = false,
}: HoverCardBaseProps) {
  const [open, setOpen] = React.useState(false);

  // Reset internal state when force-closed so the card doesn't reopen
  // immediately when forceClose is lifted (e.g. after closing a dropdown).
  React.useEffect(() => {
    if (forceClose) setOpen(false);
  }, [forceClose]);

  if (disabled) return <>{trigger}</>;

  return (
    <HoverCard
      open={forceClose ? false : open}
      onOpenChange={setOpen}
      openDelay={openDelay}
      closeDelay={closeDelay}
      defaultOpen={defaultOpen}
    >
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn("w-72 p-0 overflow-hidden rounded-2xl", className)}
      >
        {children}
      </HoverCardContent>
    </HoverCard>
  );
}
