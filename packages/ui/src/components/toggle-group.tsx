"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle, toggleVariants } from "@repo/ui/components/toggle";
import { cn } from "@repo/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
	size: "default",
	variant: "default",
});

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupPrimitive.Props & VariantProps<typeof toggleVariants>>(
	({ className, variant, size, children, ...props }, ref) => (
		<ToggleGroupPrimitive ref={ref} className={cn("flex items-center justify-center gap-1", className)} {...props}>
			<ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive>
	)
);

ToggleGroup.displayName = "ToggleGroup";

const ToggleGroupItem = React.forwardRef<
	HTMLButtonElement,
	React.ComponentPropsWithoutRef<typeof Toggle> & VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
	const context = React.useContext(ToggleGroupContext);

	return (
		<Toggle
			ref={ref}
			className={cn(className)}
			variant={context.variant || variant}
			size={context.size || size}
			{...props}
		>
			{children}
		</Toggle>
	);
});

ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
