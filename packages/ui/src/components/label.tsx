"use client";

import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const labelVariants = cva("font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", {
	variants: {
		variant: {
			default: "text-sm",
			heading: "text-base font-semibold",
			subheading: "text-sm font-semibold",
			description: "text-xs text-muted-foreground",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const Label = React.forwardRef<
	HTMLLabelElement,
	React.ComponentPropsWithoutRef<"label"> & VariantProps<typeof labelVariants>
>(({ className, variant, onMouseDown, ...props }, ref) => (
	// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor/children/nested control are forwarded via ...props, this is a generic wrapper
	<label
		ref={ref}
		className={cn(labelVariants({ variant, className }))}
		onMouseDown={(event) => {
			const target = event.target as HTMLElement;
			if (target.closest("button, input, select, textarea")) return;
			onMouseDown?.(event);
			if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
		}}
		{...props}
	/>
));
Label.displayName = "Label";

export { Label };
