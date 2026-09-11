"use client";

import { PreviewCard as HoverCardPrimitive } from "@base-ui/react/preview-card";
import { cn } from "@repo/ui/lib/utils";
import * as React from "react";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardPortal = HoverCardPrimitive.Portal;

const HoverCardContent = React.forwardRef<
	React.ElementRef<typeof HoverCardPrimitive.Popup>,
	React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Popup> &
		Pick<React.ComponentProps<typeof HoverCardPrimitive.Positioner>, "align" | "alignOffset" | "side" | "sideOffset">
>(({ className, align = "center", alignOffset, side, sideOffset = 4, ...props }, ref) => (
	<HoverCardPortal>
		<HoverCardPrimitive.Positioner
			align={align}
			alignOffset={alignOffset}
			side={side}
			sideOffset={sideOffset}
			className="isolate z-50"
		>
			<HoverCardPrimitive.Popup
				ref={ref}
				className={cn(
					"z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)",
					className
				)}
				{...props}
			/>
		</HoverCardPrimitive.Positioner>
	</HoverCardPortal>
));
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardTrigger, HoverCardContent };
