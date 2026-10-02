import { cn } from "@repo/ui/lib/utils";
import type { HTMLAttributes } from "react";

interface PortalCardProps extends HTMLAttributes<HTMLDivElement> {
	/** 20px padding (default). Pass `false` to lay out the inside yourself. */
	padded?: boolean;
}

/** Radius-14 surface card with a hairline border (dark mode adds the inset top highlight). */
export function PortalCard({ padded = true, className, ...props }: PortalCardProps) {
	return (
		<div
			className={cn(
				"rounded-portal-lg border border-portal-line bg-portal-surface shadow-portal-hl",
				padded && "p-5",
				className
			)}
			{...props}
		/>
	);
}

/** 13px semibold card heading ("Details", "What it touches"…). */
export function PortalCardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
	return <h3 className={cn("mb-3 font-semibold text-[13px] text-portal-fg", className)} {...props} />;
}
