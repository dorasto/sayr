import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const inputVariants = cva(
	"flex h-10 w-full rounded-md bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all",
	{
		variants: {
			variant: {
				default: "border border-input focus-visible:border-primary/60",
				ghost: "border-0 bg-transparent focus-visible:bg-card/50",
				strong: "font-semibold !text-lg h-auto bg-transparent",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & VariantProps<typeof inputVariants>>(
	({ className, type, variant, ...props }, ref) => {
		return <input type={type} className={cn(inputVariants({ variant, className }))} ref={ref} {...props} />;
	}
);
Input.displayName = "Input";

export { Input };
