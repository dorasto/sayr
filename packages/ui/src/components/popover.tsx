"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@repo/ui/lib/utils";
import * as React from "react";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

// Base UI's Popover has no Anchor part — Radix's `virtualRef`-based anchor
// (a ref to an already-rendered DOM element, not a literal child) becomes
// the Positioner's `anchor` prop instead. Kept as an inert passthrough so
// existing call sites keep compiling; it no longer anchors anything. See
// the popover migration report for the one known caller relying on this
// (`usePanelTrigger` in apps/start).
function PopoverAnchor({
	virtualRef: _virtualRef,
	..._props
}: { virtualRef?: React.RefObject<{ getBoundingClientRect(): DOMRect } | null> } & React.ComponentProps<"span">) {
	return null;
}

const PopoverContent = React.forwardRef<
	React.ElementRef<typeof PopoverPrimitive.Popup>,
	React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Popup> &
		Pick<React.ComponentProps<typeof PopoverPrimitive.Positioner>, "align" | "alignOffset" | "side" | "sideOffset">
>(({ className, align = "center", alignOffset, side, sideOffset = 4, ...props }, ref) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Positioner
			align={align}
			alignOffset={alignOffset}
			side={side}
			sideOffset={sideOffset}
			className="isolate z-50"
		>
			<PopoverPrimitive.Popup
				ref={ref}
				className={cn(
					"z-50 w-72 rounded-xl! border bg-popover p-4 text-popover-foreground shadow-md outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)",
					className
				)}
				{...props}
			/>
		</PopoverPrimitive.Positioner>
	</PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
