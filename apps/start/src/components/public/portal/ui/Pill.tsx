import { cn } from "@repo/ui/lib/utils";
import { IconBrandGithub } from "@tabler/icons-react";
import type { ReactNode } from "react";

type PillVariant = "author" | "team" | "gh";

const PILL_STYLES: Record<PillVariant, string> = {
	author: "bg-primary/15 text-primary font-semibold",
	team: "bg-muted text-foreground font-semibold",
	gh: "bg-muted text-muted-foreground font-medium",
};

const DEFAULT_LABELS: Record<PillVariant, ReactNode> = {
	author: "Author",
	team: "Team",
	gh: (
		<>
			<IconBrandGithub aria-hidden className="size-3" />
			via GitHub
		</>
	),
};

interface PillProps {
	variant: PillVariant;
	/** Defaults to "Author", "Team" and "via GitHub" respectively. */
	children?: ReactNode;
	className?: string;
}

/** 22px byline pill: Author, Team, or a neutral `gh` pill (e.g. "via GitHub", or a custom tag such as a version). */
export function Pill({ variant, children, className }: PillProps) {
	return (
		<span
			className={cn(
				"inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs",
				PILL_STYLES[variant],
				className
			)}
		>
			{children ?? DEFAULT_LABELS[variant]}
		</span>
	);
}
