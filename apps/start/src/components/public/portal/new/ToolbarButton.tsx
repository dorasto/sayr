import { Button } from "@repo/ui/components/button";
import type { ReactNode } from "react";

interface ToolbarButtonProps {
	label: string;
	title?: string;
	pressed?: boolean;
	disabled?: boolean;
	type?: "button" | "submit";
	/** Keep the text selection (and focus) in the editor while the button is used. */
	holdFocus?: boolean;
	onClick?: () => void;
	children: ReactNode;
}

/** One icon button in the new post form's editor toolbar. */
export function ToolbarButton({
	label,
	title = label,
	pressed,
	disabled,
	type = "button",
	holdFocus,
	onClick,
	children,
}: ToolbarButtonProps) {
	return (
		<Button
			type={type}
			variant="ghost"
			size="icon"
			title={title}
			aria-label={label}
			aria-pressed={pressed}
			disabled={disabled}
			onMouseDown={holdFocus ? (event) => event.preventDefault() : undefined}
			onClick={onClick}
			className="size-8 max-md:size-11 aria-pressed:bg-primary/15 aria-pressed:text-primary"
		>
			{children}
		</Button>
	);
}
