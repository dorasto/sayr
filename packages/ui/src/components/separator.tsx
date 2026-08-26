"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "@repo/ui/lib/utils";
import * as React from "react";

const Separator = React.forwardRef<
	React.ElementRef<typeof SeparatorPrimitive>,
	React.ComponentPropsWithoutRef<typeof SeparatorPrimitive>
>(({ className, orientation = "horizontal", ...props }, ref) => (
	<SeparatorPrimitive
		ref={ref}
		orientation={orientation}
		className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
		{...props}
	/>
));
Separator.displayName = "Separator";

export { Separator };
