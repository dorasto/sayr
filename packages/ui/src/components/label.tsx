"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
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
	React.ElementRef<typeof LabelPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, variant, ...props }, ref) => (
	<LabelPrimitive.Root ref={ref} className={cn(labelVariants({ variant, className }))} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
