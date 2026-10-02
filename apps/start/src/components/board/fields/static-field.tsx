import type { ReactNode } from "react";

interface StaticFieldProps {
	className?: string;
	title?: string;
	children: ReactNode;
}

/**
 * What every `Field*` picker renders when the board's `canEditFields` capability is off:
 * the same visual as the interactive trigger, minus the button + popover/combobox. It is a
 * plain element with no handlers, so pointer events fall through to the surrounding row/card
 * link (a read-only board's rows stay clickable).
 */
export function StaticField({ className, title, children }: StaticFieldProps) {
	return (
		<span className={className} title={title}>
			{children}
		</span>
	);
}
