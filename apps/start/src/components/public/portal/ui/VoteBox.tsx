import { cn } from "@repo/ui/lib/utils";
import { formatCount } from "@repo/util";
import { IconChevronUp } from "@tabler/icons-react";
import type { MouseEvent } from "react";

interface VoteBoxProps {
	count: number;
	voted: boolean;
	onToggle?: () => void;
	/** Voting closed (canceled posts). */
	disabled?: boolean;
	/** Small variant (40x48) for compact rows; default is 48x56. */
	size?: "md" | "sm";
	className?: string;
}

/** Upvote toggle for list rows. Never login-gated; stops the click so it doesn't open the row. */
export function VoteBox({ count, voted, onToggle, disabled, size = "md", className }: VoteBoxProps) {
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (!disabled) onToggle?.();
	};

	return (
		<button
			type="button"
			aria-pressed={voted}
			aria-label={`Upvote, ${count} ${count === 1 ? "vote" : "votes"}`}
			disabled={disabled}
			onClick={handleClick}
			className={cn(
				"flex shrink-0 cursor-pointer flex-col items-center justify-center gap-px border text-portal-fg-2 outline-none transition-colors",
				size === "sm" ? "h-12 w-10 rounded-[9px]" : "h-14 w-12 rounded-portal-md",
				voted
					? "border-portal-accent-line bg-portal-accent-soft text-portal-accent-ink"
					: "border-portal-line-2 bg-portal-surface hover:border-portal-accent-line focus-visible:border-portal-accent-line hover:text-portal-accent-ink focus-visible:text-portal-accent-ink",
				disabled &&
					"cursor-not-allowed opacity-50 hover:border-portal-line-2 focus-visible:border-portal-line-2 hover:text-portal-fg-2 focus-visible:text-portal-fg-2",
				className
			)}
		>
			<IconChevronUp aria-hidden className="size-4" stroke={2} />
			<b className={cn("font-semibold tabular-nums leading-[18px]", size === "sm" ? "text-[13px]" : "text-sm")}>
				{formatCount(count)}
			</b>
		</button>
	);
}
