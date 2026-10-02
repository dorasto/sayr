import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
	/** Icon element, sized by the caller (e.g. `<IconInbox className="size-6" />`). */
	icon: ReactNode;
	/** `accent` (amber tile) for first-run "be the first" states, `neutral` otherwise. */
	tone?: "neutral" | "accent";
	title: ReactNode;
	description?: ReactNode;
	/** Buttons, e.g. a `PortalButton`. */
	actions?: ReactNode;
	className?: string;
}

/** Centered empty/no-results state: 48px icon tile, title, description and action buttons. */
export function EmptyState({ icon, tone = "neutral", title, description, actions, className }: EmptyStateProps) {
	return (
		<div className={cn("mx-auto flex max-w-[340px] flex-col items-center text-center", className)}>
			<span
				aria-hidden
				className={cn(
					"mb-3.5 inline-flex size-12 items-center justify-center rounded-[14px]",
					tone === "accent" ? "bg-portal-accent-soft text-portal-accent-ink" : "bg-portal-raised text-portal-fg-2"
				)}
			>
				{icon}
			</span>
			<div className="font-semibold text-base text-portal-fg">{title}</div>
			{description && <p className="mt-1.5 text-portal-fg-2 text-sm leading-[21px]">{description}</p>}
			{actions && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
		</div>
	);
}
