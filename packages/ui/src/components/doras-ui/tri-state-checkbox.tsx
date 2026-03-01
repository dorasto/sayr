"use client";

import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconMinus } from "@tabler/icons-react";
import * as React from "react";

type TriState = "all" | "some" | "none";

interface TriStateCheckboxProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	state: TriState;
}

/**
 * A visual tri-state checkbox that renders checked (all), indeterminate (some), or unchecked (none).
 * Styled to match the Radix Checkbox appearance without depending on Radix primitives.
 *
 * Use as a controlled visual — wrap in a `<button>` or attach `onClick` directly.
 */
const TriStateCheckbox = React.forwardRef<HTMLButtonElement, TriStateCheckboxProps>(
	({ state, className, ...props }, ref) => {
		return (
			<button
				ref={ref}
				type="button"
				className={cn(
					"flex items-center justify-center size-4 p-0.5 shrink-0 rounded-md border cursor-pointer",
					(state === "all" || state === "some") && "bg-secondary text-primary-foreground",
					className,
				)}
				{...props}
			>
				{state === "all" && <IconCheck className="size-4" />}
				{state === "some" && <IconMinus className="size-4" />}
			</button>
		);
	},
);
TriStateCheckbox.displayName = "TriStateCheckbox";

export { TriStateCheckbox, type TriState, type TriStateCheckboxProps };
