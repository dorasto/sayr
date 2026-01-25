import { Button as BaseButton, type ButtonProps as BaseButtonProps } from "@repo/ui/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import React from "react";

export interface ButtonProps extends BaseButtonProps {
	pressed?: boolean;
	tooltip?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ pressed, tooltip, className, children, ...props }, ref) => {
		const button = (
			<BaseButton
				ref={ref}
				variant={pressed ? "primary" : "ghost"}
				size="icon"
				className={cn("h-8 w-8", pressed && "bg-accent text-accent-foreground", className)}
				aria-pressed={pressed}
				{...props}
			>
				{children}
			</BaseButton>
		);

		if (tooltip) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>{button}</TooltipTrigger>
						<TooltipContent>
							<p>{tooltip}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		}

		return button;
	}
);

Button.displayName = "Button";
