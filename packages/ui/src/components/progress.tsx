"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@repo/ui/lib/utils";
import * as React from "react";

const Progress = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
		{...props}
	>
		<ProgressPrimitive.Track className="relative h-full w-full">
			<ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-primary transition-all" />
		</ProgressPrimitive.Track>
	</ProgressPrimitive.Root>
));
Progress.displayName = "Progress";

export { Progress };
