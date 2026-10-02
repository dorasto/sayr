import { Button } from "@repo/ui/components/button";
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

/** Full-width primary "Upvote"; voted becomes a tinted "You upvoted". Never login-gated. */
export function VoteButton({ count, voted, onToggle, disabled, showCount = false, className }: VoteButtonProps) {
	return (
		<Button
			type="button"
			size="lg"
			aria-pressed={voted}
			aria-label={`${voted ? "You upvoted" : "Upvote"}, ${count} ${count === 1 ? "vote" : "votes"}`}
			disabled={disabled}
			onClick={() => onToggle?.()}
			className={cn(
				"w-full border text-[15px]",
				voted
					? "border-primary/50 bg-primary/15 font-medium text-primary hover:bg-primary/15"
					: "border-transparent",
				className
			)}
		>
			{voted ? <IconCheck aria-hidden /> : <IconChevronUp aria-hidden />}
			{`${voted ? "You upvoted" : "Upvote"}${showCount ? ` · ${count}` : ""}`}
		</Button>
	);
}
