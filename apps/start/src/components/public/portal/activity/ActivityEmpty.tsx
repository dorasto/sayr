import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

interface ActivityEmptyProps {
	icon: ReactNode;
	title: string;
	description: string;
	actions?: ReactNode;
	tone?: "neutral" | "accent";
	className: string;
}

/** Centered empty state: icon tile, title, description and optional action buttons. */
export function ActivityEmpty({ icon, title, description, actions, tone = "neutral", className }: ActivityEmptyProps) {
	return (
		<div className={cn("mx-auto flex max-w-[340px] flex-col items-center text-center", className)}>
			<span
				aria-hidden
				className={cn(
					"mb-3.5 inline-flex size-12 items-center justify-center rounded-xl",
					tone === "accent" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
				)}
			>
				{icon}
			</span>
			<div className="font-semibold text-base text-foreground">{title}</div>
			<p className="mt-1.5 text-muted-foreground text-sm leading-[21px]">{description}</p>
			{actions && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
		</div>
	);
}
