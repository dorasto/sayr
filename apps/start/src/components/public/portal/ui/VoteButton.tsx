import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconChevronUp } from "@tabler/icons-react";

interface VoteButtonProps {
	count: number;
	voted: boolean;
	onToggle?: () => void;
	/** Voting closed (canceled posts). */
	disabled?: boolean;
	/** Append the vote count to the label ("Upvote · 3"), for places where the count is not shown beside the button. */
	showCount?: boolean;
	className?: string;
}

/** 44px full-width primary "Upvote" (dark on-accent text); voted becomes a tinted "You upvoted". Never login-gated. */
export function VoteButton({ count, voted, onToggle, disabled, showCount = false, className }: VoteButtonProps) {
	return (
		<button
			type="button"
			aria-pressed={voted}
			aria-label={`${voted ? "You upvoted" : "Upvote"}, ${count} ${count === 1 ? "vote" : "votes"}`}
			disabled={disabled}
			onClick={() => onToggle?.()}
			className={cn(
				"inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-portal-md border text-[15px] outline-none transition-colors",
				voted
					? "border-portal-accent-line bg-portal-accent-soft font-medium text-portal-accent-ink"
					: "border-transparent bg-portal-accent font-semibold text-portal-on-accent hover:bg-[oklch(0.82_0.165_76)] focus-visible:bg-[oklch(0.82_0.165_76)]",
				disabled && "cursor-not-allowed opacity-50",
				className
			)}
		>
			{voted ? <IconCheck aria-hidden className="size-4" /> : <IconChevronUp aria-hidden className="size-4" />}
			{`${voted ? "You upvoted" : "Upvote"}${showCount ? ` · ${count}` : ""}`}
		</button>
	);
}
